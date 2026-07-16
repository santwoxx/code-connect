/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fonte única dos e-mails de proprietários/administradores nativos do sistema.
// Antes duplicado em db.ts, DeliveriesView.tsx, PrintDeliveryModal.tsx e ReportsView.tsx.
export const OWNER_EMAILS: string[] = [
  'isaacbomfim.00@gmail.com',
  'brisasofc@gmail.com',
  'lucaswelglys@gmail.com',
  'natandsantosmarinho10@gmail.com',
];

export function isOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.trim().toLowerCase());
}
