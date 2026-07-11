// ============================================================
// SHOPEE SYNC ENGINE
// ============================================================
// Main orchestrator for syncing Shopee data to KasFlow.
// Coordinates: statements (payout release details) and orders.
// ============================================================

import type {
  MarketplaceConnection,
  MarketplaceAccountMapping,
  MarketplaceStatement,
  MarketplaceOrder,
  MarketplaceSyncLog,
  Category,
  CashAccount,
} from "@/lib/types";
import { syncStatements, type SyncStatementsResult } from "./sync-statements";
import { syncOrders, type SyncOrdersResult } from "./sync-orders";
import { uid } from "@/lib/utils";

export type SyncEngineParams = {
  connection: MarketplaceConnection;
  mappings: MarketplaceAccountMapping[];
  categories: Category[];
  cashAccounts: CashAccount[];
  companyId: string;
  partnerId: number;
  partnerKey: string;
  mode: "full" | "incremental" | "backfill";
  startDate?: string; // ISO date string
  endDate?: string; // ISO date string
};

export type SyncEngineResult = {
  syncLogId: string;
  status: "success" | "error" | "partial";
  startedAt: string;
  completedAt: string;
  duration: number; // milliseconds
  statements: {
    fetched: number;
    created: number;
    updated: number;
  };
  orders: {
    fetched: number;
    created: number;
    updated: number;
  };
  transactions: {
    created: number;
  };
  errors: Array<{
    stage: string;
    message: string;
  }>;
  data: {
    statements: MarketplaceStatement[];
    orders: MarketplaceOrder[];
    statementLinks: SyncStatementsResult["statementLinks"];
  };
};

/**
 * Determine sync start date based on mode
 */
function getSyncStartDate(
  mode: "full" | "incremental" | "backfill",
  connection: MarketplaceConnection,
  customStartDate?: string
): string | undefined {
  if (customStartDate) {
    return customStartDate;
  }

  if (mode === "incremental" && connection.lastSyncAt) {
    return connection.lastSyncAt.split("T")[0];
  }

  if (mode === "full" || mode === "backfill" || !connection.lastSyncAt) {
    return connection.syncStartDate || new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  }

  return undefined;
}

/**
 * Main Shopee sync orchestrator
 */
export async function runSync(params: SyncEngineParams): Promise<SyncEngineResult> {
  const {
    connection,
    mappings,
    categories,
    cashAccounts,
    companyId,
    partnerId,
    partnerKey,
    mode,
    startDate: customStartDate,
    endDate: customEndDate,
  } = params;

  const syncLogId = uid("mkp_sync");
  const startedAt = new Date().toISOString();
  const errors: SyncEngineResult["errors"] = [];

  // Validate connection parameters
  if (!connection.accessToken || !connection.shopId) {
    throw new Error("Connection missing access token or shop ID");
  }

  const shopId = Number(connection.shopId);
  if (isNaN(shopId)) {
    throw new Error(`Invalid shop ID format: ${connection.shopId}`);
  }

  // Determine sync start date
  const syncStartDate = getSyncStartDate(mode, connection, customStartDate);

  // Initialize result object
  const result: SyncEngineResult = {
    syncLogId,
    status: "success",
    startedAt,
    completedAt: "",
    duration: 0,
    statements: { fetched: 0, created: 0, updated: 0 },
    orders: { fetched: 0, created: 0, updated: 0 },
    transactions: { created: 0 },
    errors,
    data: {
      statements: [],
      orders: [],
      statementLinks: [],
    },
  };

  // Common parameters
  const apiParams = {
    accessToken: connection.accessToken,
    shopId,
    partnerId,
    partnerKey,
    companyId,
    connectionId: connection.id,
    startDate: syncStartDate,
    endDate: customEndDate,
  };

  // ── STAGE 1: SYNC STATEMENTS (REVENUE & RELEASE DETAIL) ──
  try {
    console.log("[Shopee SyncEngine] Stage 1: Syncing payments & statements...");
    const statementsResult = await syncStatements({
      ...apiParams,
      mappings,
      categories,
      cashAccounts,
    });

    result.data.statements = statementsResult.statements;
    result.data.statementLinks = statementsResult.statementLinks;
    result.statements.fetched = statementsResult.statements.length;
    result.statements.created = statementsResult.newStatements.length;
    result.statements.updated = statementsResult.updatedStatements.length;
    result.transactions.created = statementsResult.transactionsCreated;

    console.log(`[Shopee SyncEngine] Statements: ${result.statements.fetched} fetched, ${result.statements.created} new, ${result.transactions.created} transactions`);
  } catch (error) {
    console.error("[Shopee SyncEngine] Statement sync failed:", error);
    errors.push({
      stage: "statements",
      message: error instanceof Error ? error.message : String(error),
    });
    result.status = "partial";
  }

  // ── STAGE 2: SYNC ORDERS (ANALYTICS CACHE) ──
  try {
    console.log("[Shopee SyncEngine] Stage 2: Syncing orders...");
    const ordersResult = await syncOrders(apiParams);

    result.data.orders = ordersResult.orders;
    result.orders.fetched = ordersResult.fetched;
    result.orders.created = ordersResult.created;
    result.orders.updated = ordersResult.updated;

    console.log(`[Shopee SyncEngine] Orders: ${result.orders.fetched} fetched`);
  } catch (error) {
    console.error("[Shopee SyncEngine] Order sync failed:", error);
    errors.push({
      stage: "orders",
      message: error instanceof Error ? error.message : String(error),
    });
    result.status = "partial";
  }

  // Finalize
  const completedAt = new Date().toISOString();
  result.completedAt = completedAt;
  result.duration = new Date(completedAt).getTime() - new Date(startedAt).getTime();

  if (errors.length > 0 && result.statements.fetched === 0 && result.orders.fetched === 0) {
    result.status = "error";
  }

  console.log(`[Shopee SyncEngine] Completed in ${result.duration}ms with status: ${result.status}`);

  return result;
}

/**
 * Create sync log record
 */
export function createSyncLogFromResult(
  result: SyncEngineResult,
  connectionId: string,
  companyId: string,
  syncType: "full" | "incremental" | "backfill"
): MarketplaceSyncLog {
  return {
    id: result.syncLogId,
    connectionId,
    companyId,
    syncType,
    status: result.status,
    recordsFetched: result.statements.fetched + result.orders.fetched,
    recordsCreated: result.statements.created + result.orders.created,
    recordsUpdated: result.statements.updated + result.orders.updated,
    recordsSkipped: 0,
    errorMessage: result.errors.length > 0 ? result.errors.map((e) => e.message).join("; ") : undefined,
    startedAt: result.startedAt,
    completedAt: result.completedAt,
    createdAt: result.startedAt,
  };
}
