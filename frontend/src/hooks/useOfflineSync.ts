/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect } from 'react';
import { db, uploadBase64Image } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';
import { saveSale, saveDelivery } from '../db';

export function useOfflineSync() {
  const syncOfflineData = useCallback(async () => {
    if (!navigator.onLine) return;

    const offlineSalesStr = localStorage.getItem('offline_sales');
    const offlineDeliveriesStr = localStorage.getItem('offline_deliveries');
    const offlineSigsStr = localStorage.getItem('offline_signatures_queue');

    if (!offlineSalesStr && !offlineDeliveriesStr && !offlineSigsStr) return;

    const offlineSales = offlineSalesStr ? JSON.parse(offlineSalesStr) : [];
    const offlineDeliveries = offlineDeliveriesStr ? JSON.parse(offlineDeliveriesStr) : [];
    const offlineSigs = offlineSigsStr ? JSON.parse(offlineSigsStr) : [];

    if (offlineSales.length === 0 && offlineDeliveries.length === 0 && offlineSigs.length === 0) return;

    console.log(`[Offline Sync] Starting sync of ${offlineSales.length} sales, ${offlineDeliveries.length} deliveries and ${offlineSigs.length} signature packs...`);

    let salesSyncCount = 0;
    let deliveriesSyncCount = 0;
    let sigsSyncCount = 0;

    // Sync sales
    for (const sale of offlineSales) {
      try {
        await saveSale(sale);
        salesSyncCount++;
      } catch (err) {
        console.error("Failed to sync offline sale:", sale, err);
      }
    }

    // Sync deliveries
    for (const delivery of offlineDeliveries) {
      try {
        await saveDelivery(delivery);
        deliveriesSyncCount++;
      } catch (err) {
        console.error("Failed to sync offline delivery:", delivery, err);
      }
    }

    // Sync Signatures
    const failedSigs = [];
    for (const sigTask of offlineSigs) {
      try {
        if (sigTask.type === 'delivery') {
          const customerUrl = sigTask.customerSig && sigTask.customerSig.startsWith('data:') ? await uploadBase64Image(sigTask.customerSig, `deliveries/${sigTask.id}_customer_signature.png`) : sigTask.customerSig;
          const delivererUrl = sigTask.delivererSig && sigTask.delivererSig.startsWith('data:') ? await uploadBase64Image(sigTask.delivererSig, `deliveries/${sigTask.id}_deliverer_signature.png`) : sigTask.delivererSig;
          const photoUrl = sigTask.deliveryPhoto && sigTask.deliveryPhoto.startsWith('data:') ? await uploadBase64Image(sigTask.deliveryPhoto, `deliveries/${sigTask.id}_delivery_photo.jpg`) : sigTask.deliveryPhoto;

          const deliveryRef = doc(db, 'deliveries', sigTask.id);
          await setDoc(deliveryRef, {
            customerSignature: customerUrl,
            delivererSignature: delivererUrl,
            deliveryPhoto: photoUrl
          }, { merge: true });
          sigsSyncCount++;
        } else if (sigTask.type === 'assembly') {
          const assemblerUrl = sigTask.assemblerSig && sigTask.assemblerSig.startsWith('data:') ? await uploadBase64Image(sigTask.assemblerSig, `assemblies/${sigTask.id}_assembler_signature.png`) : sigTask.assemblerSig;
          const customerUrl = sigTask.customerSig && sigTask.customerSig.startsWith('data:') ? await uploadBase64Image(sigTask.customerSig, `assemblies/${sigTask.id}_customer_signature.png`) : sigTask.customerSig;
          const photoUrl = sigTask.assemblyPhoto && sigTask.assemblyPhoto.startsWith('data:') ? await uploadBase64Image(sigTask.assemblyPhoto, `assemblies/${sigTask.id}_assembly_photo.jpg`) : sigTask.assemblyPhoto;

          const deliveryRef = doc(db, 'deliveries', sigTask.id);
          await setDoc(deliveryRef, {
            assemblerSignature: assemblerUrl,
            assemblyCustomerSignature: customerUrl,
            assemblyPhoto: photoUrl
          }, { merge: true });
          sigsSyncCount++;
        }
      } catch (err) {
        console.error("Failed to sync signature:", sigTask.id, err);
        failedSigs.push(sigTask);
      }
    }

    // Clear localStorage
    localStorage.removeItem('offline_sales');
    localStorage.removeItem('offline_deliveries');
    if (failedSigs.length > 0) {
      localStorage.setItem('offline_signatures_queue', JSON.stringify(failedSigs));
    } else {
      localStorage.removeItem('offline_signatures_queue');
    }

    if (salesSyncCount > 0 || deliveriesSyncCount > 0 || sigsSyncCount > 0) {
      alert(`[Sincronização] Conexão restabelecida! ${salesSyncCount} venda(s), ${deliveriesSyncCount} entrega(s) e ${sigsSyncCount} pacote(s) de imagens/assinaturas sincronizados com sucesso.`);
    }
  }, []);

  useEffect(() => {
    // Sync on load
    syncOfflineData();

    // Sync on connection recovery
    window.addEventListener('online', syncOfflineData);
    return () => {
      window.removeEventListener('online', syncOfflineData);
    };
  }, [syncOfflineData]);
}
