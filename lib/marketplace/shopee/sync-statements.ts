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
  const releaseTimeFrom = startDate
    ? Math.floor(new Date(`${startDate}T00:00:00+07:00`).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
  
  const releaseTimeTo = endDate
    ? Math.floor(new Date(`${endDate}T23:59:59+07:00`).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const rawIncomeDetails: ShopeeIncomeDetail[] = [];
  let cursor = "";
  let hasMore = true;

  // Step 1: Pull granular income details from Shopee API
  // Using v2.payment.get_income_detail
  try {
    while (hasMore) {
      const extraParams: Record<string, any> = {
        release_time_from: releaseTimeFrom,
        release_time_to: releaseTimeTo,
        page_size: 100,
      };

      if (cursor) {
        extraParams.cursor = cursor;
      }

      const response = await shopeeApiGet<any>(
        "/api/v2/payment/get_income_detail",
        partnerId,
        partnerKey,
        accessToken,
        shopId,
        extraParams
      );

      if (response && response.income_list) {
        response.income_list.forEach((inc: any) => {
          rawIncomeDetails.push({
            order_sn: inc.order_sn,
            buyer_payment_method: inc.buyer_payment_method || "",
            income_amount: parseFloat(inc.income_amount || "0") || 0,
            revenue_amount: parseFloat(inc.revenue_amount || "0") || 0,
            platform_fee: parseFloat(inc.platform_fee || "0") || 0,
            adjustment_amount: parseFloat(inc.adjustment_amount || "0") || 0,
            shipping_fee: parseFloat(inc.shipping_fee || "0") || 0,
            voucher_seller: parseFloat(inc.voucher_seller || "0") || 0,
            voucher_shopee: parseFloat(inc.voucher_shopee || "0") || 0,
            release_time: inc.release_time,
          });
        });
      }

      hasMore = response?.has_more || false;
      cursor = response?.next_cursor || "";

      if (hasMore) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
  } catch (err) {
    console.error("[Shopee Sync] Failed to fetch get_income_detail, falling back to empty list:", err);
  }

  console.log(`[Shopee SyncStatements] Fetched ${rawIncomeDetails.length} granular income records`);

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
