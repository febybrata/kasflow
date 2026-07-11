// ============================================================
// SYNC STATEMENTS
// ============================================================
// Core sync logic: fetch statements from TikTok Finance API,
// upsert to cache, and create KasFlow transactions for new ones.
//
// Flow:
// 1. Fetch statements (paginated) from TikTok API
// 2. Upsert to marketplace_statements cache
// 3. For each NEW statement (kasflow_income_txn_id IS NULL):
//    → Create max 3 transactions (income, expense, transfer)
//    → Link transaction IDs back to statement
// ============================================================

import type {
  MarketplaceStatement,
  MarketplaceAccountMapping,
  MarketplaceSyncResult,
  Category,
  CashAccount,
} from "@/lib/types";
import { fetchAllPages } from "./client";
import { createTransactionsFromStatement } from "./create-transactions";
import type { TikTokStatement, TikTokStatementTransaction } from "./types";
import { uid } from "@/lib/utils";

export type SyncStatementsParams = {
  accessToken: string;
  shopCipher: string;
  appKey: string;
  appSecret: string;
  companyId: string;
  connectionId: string;
  startDate?: string; // ISO date string (e.g., "2026-01-01")
  endDate?: string; // ISO date string for upper bound filter
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
 * Convert TikTok API statement to KasFlow MarketplaceStatement
 */
function convertToStatement(
  tiktokStmt: TikTokStatement,
  connectionId: string,
  companyId: string
): MarketplaceStatement {
  return {
    id: uid("mkp_stmt"),
    connectionId,
    companyId,
    platformStatementId: tiktokStmt.id,
    statementTime: tiktokStmt.statement_time
      ? new Date(tiktokStmt.statement_time * 1000).toISOString()
      : undefined,
    currency: tiktokStmt.currency || "IDR",
    settlementAmount: parseFloat(tiktokStmt.settlement_amount) || 0,
    revenueAmount: parseFloat(tiktokStmt.revenue_amount) || 0,
    feeAmount: parseFloat(tiktokStmt.fee_amount) || 0,
    adjustmentAmount: parseFloat(tiktokStmt.adjustment_amount) || 0,
    netSalesAmount: parseFloat(tiktokStmt.net_sales_amount) || 0,
    shippingCostAmount: parseFloat(tiktokStmt.shipping_cost_amount) || 0,
    paymentStatus: tiktokStmt.payment_status,
    paymentId: tiktokStmt.payment_id,
    paymentTime: tiktokStmt.payment_time
      ? new Date(tiktokStmt.payment_time * 1000).toISOString()
      : undefined,
    reconciled: false,
    orderCount: (tiktokStmt as any)._calculatedOrderCount || 0,
    approvalStatus: "pending_approval",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sync statements from TikTok Finance API
 *
 * IMPORTANT: This function fetches and converts data.
 * The caller is responsible for:
 * - Upserting statements to database
 * - Creating transactions in database
 * - Updating statement links (kasflow_*_txn_id)
 * - Creating sync logs
 */
export async function syncStatements(
  params: SyncStatementsParams
): Promise<SyncStatementsResult> {
  const {
    accessToken,
    shopCipher,
    appKey,
    appSecret,
    companyId,
    connectionId,
    startDate,
    endDate,
    mappings,
    categories,
    cashAccounts,
  } = params;

  // Build extra params for date filtering
  const extraParams: Record<string, any> = {
    sort_field: "statement_time",
    sort_order: "ASC",
  };

  if (startDate) {
    // Convert WIB (UTC+7) date string to UTC Unix timestamp — same approach as sync-orders.ts
    const startDateWIB = new Date(`${startDate}T00:00:00+07:00`);
    extraParams.statement_time_ge = Math.floor(startDateWIB.getTime() / 1000);
  }

  if (endDate) {
    // Convert WIB (UTC+7) to UTC, add 1 second past 23:59:59 to make exclusive upper bound
    const endDateWIB = new Date(`${endDate}T23:59:59+07:00`);
    extraParams.statement_time_lt = Math.floor(endDateWIB.getTime() / 1000) + 1;
  }

  // Fetch all statements from TikTok API
  const tiktokStatements = await fetchAllPages<TikTokStatement>(
    "/finance/202309/statements",
    accessToken,
    shopCipher,
    appKey,
    appSecret,
    extraParams,
    "statements"
  );

  console.log(`[TikTok SyncStatements] Fetched ${tiktokStatements.length} statements. Now fetching transactions to count orders...`);

  // For each statement, fetch its transactions to count unique orders
  for (const ts of tiktokStatements) {
    try {
      const transactions = await fetchAllPages<TikTokStatementTransaction>(
        `/finance/202309/statements/${ts.id}/statement_transactions`,
        accessToken,
        shopCipher,
        appKey,
        appSecret,
        { sort_field: "order_create_time", sort_order: "ASC" },
        "statement_transactions"
      );
      
      const uniqueOrders = new Set<string>();
      for (const txn of transactions) {
        if (txn.type === "ORDER" && txn.order_id) {
          uniqueOrders.add(txn.order_id);
        }
      }
      (ts as any)._calculatedOrderCount = uniqueOrders.size;
      console.log(`[TikTok SyncStatements] Statement ${ts.id} has ${uniqueOrders.size} orders`);
    } catch (err) {
      console.error(`[TikTok SyncStatements] Failed to fetch transactions for statement ${ts.id}:`, err);
      (ts as any)._calculatedOrderCount = 0;
    }
    // Small delay to prevent rate limit
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // Convert to KasFlow format
  const allStatements = tiktokStatements.map((ts) =>
    convertToStatement(ts, connectionId, companyId)
  );

  // Process new statements (create transactions)
  const newStatements: MarketplaceStatement[] = [];
  const updatedStatements: MarketplaceStatement[] = [];
  const statementLinks: SyncStatementsResult["statementLinks"] = [];
  let totalTransactionsCreated = 0;

  // NOTE: In real implementation, the caller should check existing statements
  // in DB to determine which are new vs updated. Here we treat all as new
  // and let the caller handle deduplication via platform_statement_id.

  for (const statement of allStatements) {
    // Check if statement already has transactions (idempotency check)
    // This will be done by the caller when checking kasflow_income_txn_id IS NULL
    // For now, we process all and let the caller decide

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
        reconciled: statement.paymentStatus === "PAID",
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
