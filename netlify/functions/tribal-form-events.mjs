import { getStore } from '@netlify/blobs';
import { importRentalSubmission } from '../lib/tribal-inquiry-import.mjs';

// Platform-generated, signed Netlify formSubmitted event; not a public
// unauthenticated endpoint. Only submissions verified by Netlify are imported.
export default {
  async formSubmitted(event) {
    const siteId = event?.site?.id || event?.siteId;
    if (siteId && siteId !== '1296a8dc-a399-4fa4-9be8-13963f335311') return;
    try {
      const store = getStore('tribal-owner-workspace-v1');
      const result = await importRentalSubmission(event, store);
      // Logs contain an outcome only, not guest emails, names, or phone numbers.
      console.log('Tribal verified form import:', result.outcome);
    } catch (error) {
      console.error('Tribal form import failed:', error?.name || 'unknown');
      throw error;
    }
  }
};
