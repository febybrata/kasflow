// ============================================================
// APPROVE SHOPEE VIRTUAL STATEMENTS
// ============================================================
// Manually approve Shopee virtual statements and create KasFlow transactions
// with journal entries (ledger-first architecture).
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createTransactionsFromStatement } from "@/lib/marketplace/shopee/create-transactions";
import { generateJournalFromTransaction } from "@/lib/accounting";
import type { MarketplaceStatement, MarketplaceAccountMapping, Category, CashAccount, Transaction } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Convert snake_case DB rows to camelCase
function snakeToCamel(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const result: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

// Convert camelCase to snake_case for DB insert
function camelToSnake(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnake);
  const result: any = {};
  for (const key in obj) {
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    result[snakeKey] = obj[key];
  }
  return result;
}

// Insert a transaction + its journal entry into Supabase
async function insertTransactionWithJournal(
  supabase: any,
  companyId: string,
  txn: Transaction,
  categories: Category[],
  cashAccounts: CashAccount[],
): Promise<boolean> {
  const txnRow = camelToSnake(txn);
  const { error: txnError } = await supabase
    .from("transactions")
    .insert(txnRow);

  if (txnError) {
    console.error(`[Shopee Approve] Failed to insert transaction ${txn.id}:`, txnError.message);
    return false;
  }

  try {
    const journal = generateJournalFromTransaction(txn, categories, cashAccounts, []);
    const journalRow: any = camelToSnake(journal);
    journalRow.lines = JSON.stringify(journal.lines);

    const { error: jError } = await supabase
      .from("journal_entries")
      .insert(journalRow);

    if (jError) {
      console.error(`[Shopee Approve] Failed to insert journal for txn ${txn.id}:`, jError.message);
    }
  } catch (jErr) {
    console.error(`[Shopee Approve] Journal generation failed for txn ${txn.id}:`, jErr);
  }

  return true;
}

export async function POST(request: NextRequest) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await request.json();
    const { statementIds, companyId, userId } = body;

    if (!statementIds || !Array.isArray(statementIds) || statementIds.length === 0) {
      return NextResponse.json(
        { error: "statementIds array is required" },
        { status: 400 }
      );
    }

    if (!companyId || !userId) {
      return NextResponse.json(
        { error: "companyId and userId are required" },
        { status: 400 }
      );
    }

    console.log(`[Shopee Approve] Approving ${statementIds.length} statements for company ${companyId}`);

    // Fetch statements to approve
    const { data: statements, error: fetchError } = await supabase
      .from("marketplace_statements")
      .select("*")
      .in("id", statementIds)
      .eq("company_id", companyId)
      .eq("approval_status", "pending_approval");

    if (fetchError) {
      console.error("[Shopee Approve] Failed to fetch statements:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch statements", details: fetchError.message },
        { status: 500 }
      );
    }

    if (!statements || statements.length === 0) {
      return NextResponse.json(
        { error: "No pending statements found" },
        { status: 404 }
      );
    }

    console.log(`[Shopee Approve] Found ${statements.length} pending statements`);

    // Get account mappings for transaction creation
    const { data: mappings } = await supabase
      .from("marketplace_account_mapping")
      .select("*")
      .in("connection_id", statements.map((s: any) => s.connection_id));

    // Get categories and cash accounts
    const [{ data: categoriesRaw }, { data: cashAccountsRaw }] = await Promise.all([
      supabase
        .from("account_categories")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true),
      supabase
        .from("cash_accounts")
        .select("*")
        .eq("company_id", companyId)
        .eq("is_active", true),
    ]);

    const categories: Category[] = (categoriesRaw || []).map((c: any) => ({
      id: c.id,
      companyId: c.company_id,
      name: c.name,
      type: c.type,
      accountId: c.account_id,
      isActive: c.is_active,
    }));

    const cashAccounts: CashAccount[] = (cashAccountsRaw || []).map((c: any) => ({
      id: c.id,
      companyId: c.company_id,
      name: c.name,
      type: c.type,
      accountId: c.account_id,
      isActive: c.is_active,
    }));

    const camelMappings: MarketplaceAccountMapping[] = (mappings || []).map((m: any) => ({
      id: m.id,
      connectionId: m.connection_id,
      companyId: m.company_id,
      mappingType: m.mapping_type,
      kasflowAccountId: m.kasflow_account_id,
      kasflowCashAccountId: m.kasflow_cash_account_id,
      kasflowCategoryId: m.kasflow_category_id,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }));

    const approvedIds: string[] = [];
    const failedIds: string[] = [];
    let transactionsCreated = 0;

    // Process each statement
    for (const stmtRaw of statements) {
      try {
        const stmt: MarketplaceStatement = {
          id: stmtRaw.id,
          connectionId: stmtRaw.connection_id,
          companyId: stmtRaw.company_id,
          platformStatementId: stmtRaw.platform_statement_id,
          statementTime: stmtRaw.statement_time,
          currency: stmtRaw.currency || "IDR",
          settlementAmount: parseFloat(stmtRaw.settlement_amount) || 0,
          revenueAmount: parseFloat(stmtRaw.revenue_amount) || 0,
          feeAmount: parseFloat(stmtRaw.fee_amount) || 0,
          adjustmentAmount: parseFloat(stmtRaw.adjustment_amount) || 0,
          netSalesAmount: parseFloat(stmtRaw.net_sales_amount) || 0,
          shippingCostAmount: parseFloat(stmtRaw.shipping_cost_amount) || 0,
          paymentStatus: stmtRaw.payment_status,
          paymentId: stmtRaw.payment_id,
          paymentTime: stmtRaw.payment_time,
          reconciled: stmtRaw.reconciled || false,
          kasflowIncomeTxnId: stmtRaw.kasflow_income_txn_id,
          kasflowExpenseTxnId: stmtRaw.kasflow_expense_txn_id,
          kasflowTransferTxnId: stmtRaw.kasflow_transfer_txn_id,
          orderCount: stmtRaw.order_count || 0,
          approvalStatus: 'approved',
          createdAt: stmtRaw.created_at,
          updatedAt: stmtRaw.updated_at,
        };

        const connectionMappings = camelMappings.filter(
          (m) => m.connectionId === stmt.connectionId
        );

        // Create transactions
        const txnResult = createTransactionsFromStatement(
          stmt,
          connectionMappings,
          categories,
          cashAccounts,
        );

        let incomeTxnId: string | null = null;
        let expenseTxnId: string | null = null;

        // Insert income
        if (txnResult.incomeTxn) {
          const ok = await insertTransactionWithJournal(
            supabase, companyId, txnResult.incomeTxn, categories, cashAccounts
          );
          if (ok) {
            incomeTxnId = txnResult.incomeTxn.id;
            transactionsCreated++;
          }
        }

        // Insert expense
        if (txnResult.expenseTxn) {
          const ok = await insertTransactionWithJournal(
            supabase, companyId, txnResult.expenseTxn, categories, cashAccounts
          );
          if (ok) {
            expenseTxnId = txnResult.expenseTxn.id;
            transactionsCreated++;
          }
        }

        // Update statement
        const { error: updateError } = await supabase
          .from("marketplace_statements")
          .update({
            approval_status: "approved",
            approved_by: userId,
            approved_at: new Date().toISOString(),
            kasflow_income_txn_id: incomeTxnId,
            kasflow_expense_txn_id: expenseTxnId,
            reconciled: !!(incomeTxnId || expenseTxnId),
            updated_at: new Date().toISOString(),
          })
          .eq("id", stmt.id);

        if (updateError) {
          console.error(`[Shopee Approve] Failed to update statement ${stmt.id}:`, updateError);
          failedIds.push(stmt.id);
        } else {
          approvedIds.push(stmt.id);
          console.log(`[Shopee Approve] ✅ Statement ${stmt.id} approved: income=${incomeTxnId}, expense=${expenseTxnId}`);
        }
      } catch (error) {
        console.error(`[Shopee Approve] Error processing statement ${stmtRaw.id}:`, error);
        failedIds.push(stmtRaw.id);
      }
    }

    console.log(`[Shopee Approve] Completed: ${approvedIds.length} approved, ${failedIds.length} failed, ${transactionsCreated} transactions created`);

    return NextResponse.json({
      success: true,
      summary: {
        approved: approvedIds.length,
        failed: failedIds.length,
        transactionsCreated,
      },
      approvedIds,
      failedIds,
    });
  } catch (error) {
    console.error("[Shopee Approve] Error:", error);
    return NextResponse.json(
      { error: "Failed to approve statements", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
