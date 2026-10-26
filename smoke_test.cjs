const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  try {
    await page.goto(process.env.APP_URL || 'http://127.0.0.1:10000/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.selectLibraryPiece === 'function', null, { timeout: 20000 });
    assert.match(await page.title(), /Autonomía Piano/i, 'La página principal no cargó');

    // Recorrer la pieza didáctica y comprobar que la nota que suena queda identificada.
    await page.evaluate(() => {
      const piece = repertoireLibrary.find(item => item.id === 'rp10');
      if (!piece) throw new Error('No existe la pieza brasileña de prueba rp10');
      selectLibraryPiece('rp10');
      startRepertoireLearn();
    });
    await page.waitForFunction(() => {
      const el = document.getElementById('repertoireCurrentNoteName');
      return el && /Do \(C\).*octava 4/.test(el.textContent);
    }, null, { timeout: 10000 });
    const visibleNote = await page.locator('#repertoireCurrentNoteName').innerText();
    assert.match(visibleNote, /Do \(C\).*octava 4/, 'No se muestra el nombre y la octava de la nota');
    const help = await page.locator('#repertoireCurrentNoteHelp').innerText();
    assert.match(help, /SONIDO ACTUAL|Señalamos/i, 'No se muestra la explicación de la nota actual');

    // Simular progreso y recarga en el mismo navegador.
    await page.evaluate(() => {
      state.lessons = { ...(state.lessons || {}), l1: true };
      state.repertoireProgress = { ...(state.repertoireProgress || {}), rp10: 35 };
      saveRepertoireSession('learn', 3);
      saveState();
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.selectLibraryPiece === 'function', null, { timeout: 20000 });
    const restored = await page.evaluate(() => ({
      lesson: state.lessons.l1,
      progress: state.repertoireProgress.rp10,
      session: state.repertoireSessions.rp10
    }));
    assert.equal(restored.lesson, true, 'La lección no sobrevivió a la recarga');
    assert.equal(restored.progress, 35, 'El porcentaje de repertorio no sobrevivió a la recarga');
    assert.equal(restored.session.mode, 'learn', 'No se restauró el modo de la sesión');
    assert.equal(restored.session.index, 3, 'No se restauró el índice de la sesión');
    assert.deepEqual(pageErrors, [], 'La aplicación produjo errores JavaScript: ' + pageErrors.join(' | '));

    console.log('PASS: carga inicial');
    console.log('PASS: nombre y octava de la nota visibles');
    console.log('PASS: progreso de lecciones y repertorio tras recarga');
    console.log('PASS: sin errores JavaScript de página');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
