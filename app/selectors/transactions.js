// @flow

import { createSelector } from 'reselect';
import formatAmount from 'utils/formatAmount';
import type { State } from 'modules/rootReducer';
import type { Transaction } from 'modules/transactions';
import { getCategories } from './categories';

export type TransactionSummary = {
  categoryId: string,
  value: number,
  category?: string,
};

function totalTransactions(transactions: Transaction[]): number {
  return transactions.reduce((total, item) => total + parseFloat(item.value), 0);
}

function summarizeTransactions(transactions: Transaction[]): TransactionSummary[] {
  return transactions.reduce((summary, { categoryId, value }) => {
    const sum =
      summary.find(item => item.categoryId === categoryId) || summary[summary.push({ categoryId, value: 0 }) - 1];

    sum.value += Math.abs(value);
    return summary;
  }, []);
}

export const sortTransactions = <T: { value: number }> (transactions: T[]): T[] => {
  const unsorted = [...transactions];
  return unsorted.sort((a, b) => b.value - a.value);
};

const applyCategoryName = (transactions: TransactionSummary[], categories) =>
  transactions.map(transaction => {
    transaction.category = categories[transaction.categoryId];
    return transaction;
  });

export const getTransaction = (state: State, id: Number): Transaction => {
  // use == for coercion
  // eslint-disable-next-line eqeqeq
  const filtered = (state.transactions || []).filter(t => t.id == id) || [];
  const categoryNameApplied = applyCategoryName(filtered, getCategories(state));
  return categoryNameApplied[0] || {};
};

export const getTransactions = (state: State): Transaction[] => state.transactions || [];

const getInflowTransactions = createSelector([getTransactions], transactions =>
  transactions.filter(item => item.value > 0)
);

const getOutflowTransactions = createSelector([getTransactions], transactions =>
  transactions.filter(item => item.value < 0)
);

const getBalance = createSelector([getTransactions], transactions => totalTransactions(transactions));

export const getInflowBalance = createSelector([getInflowTransactions], transactions =>
  totalTransactions(transactions)
);

export const getOutflowBalance = createSelector([getOutflowTransactions], transactions =>
  totalTransactions(transactions)
);

export const getFormattedBalance = createSelector([getBalance], amount => formatAmount(amount, false));

export const getFormattedInflowBalance = createSelector([getInflowBalance], amount => formatAmount(amount, false));

export const getFormattedOutflowBalance = createSelector([getOutflowBalance], amount => formatAmount(amount, false));

const getOutflowByCategory = createSelector([getOutflowTransactions], transactions =>
  summarizeTransactions(transactions)
);

const getInflowByCategory = createSelector([getInflowTransactions], transactions =>
  summarizeTransactions(transactions)
);

export const getOutflowByCategoryName = createSelector(getOutflowByCategory, getCategories, (trans, cat) =>
  applyCategoryName(trans, cat)
);

export const getInflowByCategoryName = createSelector(getInflowByCategory, getCategories, (trans, cat) =>
  applyCategoryName(trans, cat)
);

const formatAsPercentage = (decimalNumber: Number) => `${Number.parseFloat(decimalNumber * 100).toFixed(2)}%`;

const getPercentage = ({ state, transactionId, selector, valueDeterminer }) => {
  const { value: transactionValue } = getTransaction(state, transactionId);
  const flow: Number = selector(state);
  const value: Number = transactionValue / flow;
  return formatAsPercentage(valueDeterminer(isNaN(value) ? 0 : value));
};

export const getOutflowPercentage = (state: State, transactionId: Number) =>
  getPercentage({
    state,
    transactionId,
    selector: getOutflowBalance,
    valueDeterminer: (value: Number) => (value < 0 ? 0 : value),
  });

export const getInflowPercentage = (state: State, transactionId: Number) =>
  getPercentage({
    state,
    transactionId,
    selector: getInflowBalance,
    valueDeterminer: (value: Number) => (value > 0 ? value : 0),
  });
