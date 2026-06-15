"use client";

import { ArrowLeftRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { useTransactions } from "@/hooks/use-transactions";
import { formatDate, formatMoney } from "@/lib/format";
import type { TransactionStatus, TransactionType } from "@/types/api";

const typeLabels: Record<TransactionType, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  CLAIM_INTEREST: "Interest claim",
  CREATE_GOAL: "Goal created",
  DELETE_GOAL: "Goal closed",
};

const statusVariant: Record<TransactionStatus, "default" | "secondary" | "destructive"> = {
  SUCCESS: "secondary",
  PENDING: "default",
  FAILED: "destructive",
};

export default function TransactionsPage() {
  const { data: transactions, isLoading } = useTransactions({ limit: 100 });

  return (
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={ArrowLeftRight} title="No transactions yet" description="Deposits, withdrawals, and interest claims will show up here." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Goal</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Tx hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.goal.name}</TableCell>
                    <TableCell>{typeLabels[tx.type]}</TableCell>
                    <TableCell className="tabular-nums">
                      {Number(tx.amount) > 0 ? formatMoney(Number(tx.amount)) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[tx.status]}>{tx.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(tx.createdAt)}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {tx.txHash ? `${tx.txHash.slice(0, 8)}…` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
