// ============================================================
// SYNC STATEMENTS FOR SHOPEE
// ============================================================
// Fetch detailed income records, group by release date to create
// Virtual Daily Statements, and map them to KasFlow.
// ============================================================

import type {
  MarketplaceStatement,
  MarketplaceAccountMapping,
  Category,
  CashAccount,
} from "@/lib/types";
import { shopeeApiGet } from "./client";
import { createTransactionsFromStatement } from "./create-transactions";
import { uid } from "@/lib/utils";
import type { ShopeeIncomeDetail } from "./types";

export type SyncStatementsParams = {
  accessToken: string;
  shopId: number;
  partnerId: number;
  partnerKey: string;
  companyId: string;
  connectionId: string;
  startDate?: string; // ISO date string "YYYY-MM-DD"
  endDate?: string; // ISO date string "YYYY-MM-DD"
  mappings: MarketplaceAccountMapping[];
  categories: Category[];
  cashAccounts: CashAccount[];
};

export type SyncStatementsResult = {
  statements: MarketplaceStatement[];
  newStatements: MarketplaceStatement[];
  updatedStatements: MarketplaceStatement[];
  transactionsCreated: number;
  statementLinks: Array<{
    statementId: string;
    kasflowIncomeTxnId?: string;
    kasflowExpenseTxnId?: string;
    kasflowTransferTxnId?: string;
    reconciled?: boolean;
  }>;
};

/**
 * Convert local date string to YYYY-MM-DD based on a unix timestamp (in WIB / UTC+7)
 */
function formatReleaseDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  // Convert to UTC+7 timezone
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const nd = new Date(utc + 3600000 * 7);
  
  const y = nd.getFullYear();
  const m = String(nd.getMonth() + 1).padStart(2, "0");
  const d = String(nd.getDate()).padStart(2, "0");
  
  return `${y}-${m}-${d}`;
}

/**
 * Sync Shopee detailed income records and aggregate them into Virtual Daily Statements
 */
export async function syncStatements(
  params: SyncStatementsParams
): Promise<SyncStatementsResult> {
  const {
    accessToken,
    shopId,
    partnerId,
    partnerKey,
    companyId,
    connectionId,
    startDate,
    endDate,
    mappings,
    categories,
    cashAccounts,
  } = params;

  // Prepare date range (unix timestamps)
  const totalReleaseTimeFrom = startDate
    ? Math.floor(new Date(`${startDate}T00:00:00+07:00`).getTime() / 1000)
    : Math.floor((Date.now() - 14 * 24 * 60 * 60 * 1000) / 1000);
  
  const totalReleaseTimeTo = endDate
    ? Math.floor(new Date(`${endDate}T23:59:59+07:00`).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const rawIncomeDetails: ShopeeIncomeDetail[] = [];
  const CHUNK_SIZE_SECONDS = 14 * 24 * 60 * 60; // 14 days to be safe within 15-day limit

  let currentFrom = totalReleaseTimeFrom;

  // Step 1: Pull granular income details from Shopee API
  // Using v2.payment.get_escrow_list chunked by max 14 days
  while (currentFrom <= totalReleaseTimeTo) {
    let currentTo = currentFrom + CHUNK_SIZE_SECONDS;
    if (currentTo > totalReleaseTimeTo) {
      currentTo = totalReleaseTimeTo;
    }

    let pageNo = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const extraParams: Record<string, any> = {
          release_time_from: currentFrom,
          release_time_to: currentTo,
          page_size: 50,
          page_no: pageNo,
        };

        const response = await shopeeApiGet<any>(
          "/api/v2/payment/get_escrow_list",
          partnerId,
          partnerKey,
          accessToken,
          shopId,
          extraParams
        );

        console.log(`[Shopee Debug] get_income_detail chunk ${currentFrom} - ${currentTo}:`, JSON.stringify(response));

        const escrowList = response?.escrow_list || [];
        
        // Batch fetch details (max 5 concurrent requests)
        const BATCH_SIZE = 5;
        for (let i = 0; i < escrowList.length; i += BATCH_SIZE) {
          const batch = escrowList.slice(i, i + BATCH_SIZE);
          
          await Promise.all(batch.map(async (inc: any) => {
            try {
              const detailResp = await shopeeApiGet<any>(
                "/api/v2/payment/get_escrow_detail",
                partnerId,
                partnerKey,
                accessToken,
                shopId,
                { order_sn: inc.order_sn }
              );

              const income = detailResp?.order_income || detailResp || {};
              const payout = parseFloat(income.escrow_amount || inc.payout_amount || "0") || 0;
              
              const originalPrice = parseFloat(income.original_price || "0") || 0;
              const sellerDiscount = parseFloat(income.seller_discount || "0") || 0;
              let grossSales = originalPrice - sellerDiscount;
              
              if (grossSales === 0) {
                 grossSales = parseFloat(income.buyer_total_amount || "0") || payout;
              }

              const commission = parseFloat(income.commission_fee || "0") || 0;
              const service = parseFloat(income.service_fee || "0") || 0;
              const transaction = parseFloat(income.seller_transaction_fee || "0") || 0;
              const processing = parseFloat(income.seller_order_processing_fee || "0") || 0;
              const amsCommission = parseFloat(income.order_ams_commission_fee || income.ams_commission_fee || income.affiliate_commission || "0") || 0;
              const campaignFee = parseFloat(income.campaign_fee || "0") || 0;
              const platformFee = commission + service + transaction + processing + amsCommission + campaignFee;

              const actualShipping = parseFloat(income.actual_shipping_fee || income.final_shipping_fee || "0") || 0;
              const buyerPaidShipping = parseFloat(income.buyer_paid_shipping_fee || "0") || 0;
              const shopeeRebate = parseFloat(income.shopee_shipping_rebate || "0") || 0;
              const thirdPartyDiscount = parseFloat(income.shipping_fee_discount_from_3pf || "0") || 0;
              
              let shippingFee = actualShipping - buyerPaidShipping - shopeeRebate - thirdPartyDiscount;
              if (shippingFee < 0) shippingFee = 0;

              const adjustment = parseFloat(income.seller_lost_compensation || income.drc_adjustable_refund || "0") || 0;

              rawIncomeDetails.push({
                order_sn: inc.order_sn,
                buyer_payment_method: "",
                income_amount: payout,
                revenue_amount: grossSales,
                platform_fee: platformFee,
                adjustment_amount: adjustment,
                shipping_fee: shippingFee,
                voucher_seller: parseFloat(income.voucher_from_seller || "0") || 0,
                voucher_shopee: parseFloat(income.voucher_from_shopee || "0") || 0,
                release_time: inc.escrow_release_time,
              });
            } catch (err) {
              console.error(`[Shopee Sync] Failed to fetch escrow detail for ${inc.order_sn}:`, err);
              // Fallback to basic list data
              rawIncomeDetails.push({
                order_sn: inc.order_sn,
                buyer_payment_method: "",
                income_amount: parseFloat(inc.payout_amount || "0") || 0,
                revenue_amount: parseFloat(inc.payout_amount || "0") || 0,
                platform_fee: 0,
                adjustment_amount: 0,
                shipping_fee: 0,
                voucher_seller: 0,
                voucher_shopee: 0,
                release_time: inc.escrow_release_time,
              });
            }
          }));
          
          // Small delay to prevent rate limit
          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        hasMore = response?.more || false;
        pageNo++;

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    } catch (err) {
      console.error(`[Shopee Sync] Failed to fetch chunk ${currentFrom} - ${currentTo}, continuing to next chunk:`, err);
    }

    // Move to next chunk
    currentFrom = currentTo + 1;
  }

  console.log(`[Shopee SyncStatements] Fetched ${rawIncomeDetails.length} granular income records`);

  // Step 1.5: Pull Wallet Adjustments
  // Using v2.payment.get_wallet_transaction_list chunked by max 14 days
  const rawAdjustments: any[] = [];
  currentFrom = totalReleaseTimeFrom;
  
  while (currentFrom <= totalReleaseTimeTo) {
    let currentTo = currentFrom + CHUNK_SIZE_SECONDS;
    if (currentTo > totalReleaseTimeTo) currentTo = totalReleaseTimeTo;

    let pageNo = 1;
    let hasMore = true;

    try {
      while (hasMore) {
        const extraParams: Record<string, any> = {
          create_time_from: currentFrom,
          create_time_to: currentTo,
          page_size: 50,
          page_no: pageNo,
        };

        const response = await shopeeApiGet<any>(
          "/api/v2/payment/get_wallet_transaction_list",
          partnerId,
          partnerKey,
          accessToken,
          shopId,
          extraParams
        );

        const list = response?.transaction_list || [];
        for (const txn of list) {
          if (txn.transaction_tab_type === "wallet_adjustment_filter" || txn.transaction_type === "FULFILMENT_COMPENSATE_ADD") {
            rawAdjustments.push(txn);
          }
        }

        hasMore = response?.more || false;
        pageNo++;

        if (hasMore) {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
    } catch (err) {
      console.error(`[Shopee Sync] Failed to fetch wallet chunk ${currentFrom} - ${currentTo}:`, err);
    }
    
    currentFrom = currentTo + 1;
  }
  
  console.log(`[Shopee SyncStatements] Fetched ${rawAdjustments.length} wallet adjustments`);

  // Step 2: Group by release date to construct Virtual Daily Statements
  const groupedStatements = new Map<string, {
    releaseTime: number;
    settlementAmount: number;
    revenueAmount: number;
    feeAmount: number;
    adjustmentAmount: number;
    shippingCostAmount: number;
    orders: Set<string>;
  }>();

  rawIncomeDetails.forEach((detail) => {
    const dateStr = formatReleaseDate(detail.release_time);
    const existing = groupedStatements.get(dateStr);

    if (!existing) {
      groupedStatements.set(dateStr, {
        releaseTime: detail.release_time,
        settlementAmount: detail.income_amount,
        revenueAmount: detail.revenue_amount,
        feeAmount: detail.platform_fee,
        adjustmentAmount: detail.adjustment_amount,
        shippingCostAmount: detail.shipping_fee,
        orders: new Set([detail.order_sn]),
      });
    } else {
      existing.settlementAmount += detail.income_amount;
      existing.revenueAmount += detail.revenue_amount;
      existing.feeAmount += detail.platform_fee;
      existing.adjustmentAmount += detail.adjustment_amount;
      existing.shippingCostAmount += detail.shipping_fee;
      existing.orders.add(detail.order_sn);
    }
  });

  rawAdjustments.forEach((adj) => {
    const dateStr = formatReleaseDate(adj.create_time);
    const existing = groupedStatements.get(dateStr);
    
    const amt = parseFloat(adj.amount || "0") || 0;

    if (!existing) {
      groupedStatements.set(dateStr, {
        releaseTime: adj.create_time,
        settlementAmount: amt, // Adjustment affects settlement (net money received)
        revenueAmount: 0,
        feeAmount: 0,
        adjustmentAmount: amt,
        shippingCostAmount: 0,
        orders: new Set(),
      });
    } else {
      existing.settlementAmount += amt;
      existing.adjustmentAmount += amt;
    }
  });

  // Convert map to KasFlow MarketplaceStatement structures
  const allStatements: MarketplaceStatement[] = [];
  
  groupedStatements.forEach((data, dateStr) => {
    allStatements.push({
      id: uid("mkp_stmt"),
      connectionId,
      companyId,
      // Format platform_statement_id uniquely: shopee_stmt_{shopId}_{date}
      platformStatementId: `shopee_stmt_${shopId}_${dateStr}`,
      statementTime: new Date(data.releaseTime * 1000).toISOString(),
      currency: "IDR",
      settlementAmount: data.settlementAmount,
      revenueAmount: data.revenueAmount,
      feeAmount: data.feeAmount,
      adjustmentAmount: data.adjustmentAmount,
      netSalesAmount: data.settlementAmount, // Shopee Net Sales is equivalent to settlement amount
      shippingCostAmount: data.shippingCostAmount,
      paymentStatus: "PAID", // Shopee payment is completed/paid when released
      paymentId: undefined,
      paymentTime: new Date(data.releaseTime * 1000).toISOString(),
      reconciled: false,
      orderCount: data.orders.size,
      approvalStatus: "pending_approval",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  // Sort statements chronologically
  allStatements.sort((a, b) => {
    const aTime = a.statementTime ? new Date(a.statementTime).getTime() : 0;
    const bTime = b.statementTime ? new Date(b.statementTime).getTime() : 0;
    return aTime - bTime;
  });

  // Step 3: Process transactions (idempotent check by DB update)
  const newStatements: MarketplaceStatement[] = [];
  const updatedStatements: MarketplaceStatement[] = [];
  const statementLinks: SyncStatementsResult["statementLinks"] = [];
  let totalTransactionsCreated = 0;

  for (const statement of allStatements) {
    const txnResult = createTransactionsFromStatement(
      statement,
      mappings,
      categories,
      cashAccounts
    );

    if (txnResult.transactionsCreated > 0) {
      newStatements.push(statement);
      totalTransactionsCreated += txnResult.transactionsCreated;

      statementLinks.push({
        statementId: statement.id,
        kasflowIncomeTxnId: txnResult.incomeTxn?.id,
        kasflowExpenseTxnId: txnResult.expenseTxn?.id,
        kasflowTransferTxnId: txnResult.transferTxn?.id,
        reconciled: true,
      });
    } else {
      updatedStatements.push(statement);
    }
  }

  return {
    statements: allStatements,
    newStatements,
    updatedStatements,
    transactionsCreated: totalTransactionsCreated,
    statementLinks,
  };
}
