// Script pour exporter les logs de debug depuis chrome.storage.local vers un fichier
// À exécuter depuis la console du navigateur sur une page de l'extension

chrome.storage.local.get(['debugLogs'], (result) => {
  const logs = result.debugLogs || [];

  if (logs.length === 0) {
    console.log('Aucun log trouvé');
    return;
  }

  // Convertir en NDJSON
  const ndjson = logs.map(log => JSON.stringify(log)).join('\n');

  // Créer un blob et télécharger
  const blob = new Blob([ndjson], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'debug_logs.ndjson';
  a.click();
  URL.revokeObjectURL(url);

  console.log(`✅ ${logs.length} logs exportés`);
});