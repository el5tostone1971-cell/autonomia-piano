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
    const targetKey = await page.locator('.keys .key[data-midi="60"]').evaluate(el => ({
      outline: getComputedStyle(el).outlineWidth,
      background: getComputedStyle(el).backgroundColor
    }));
    assert.equal(targetKey.outline, '6px', 'La tecla objetivo no destaca lo suficiente');
    assert.match(targetKey.background, /rgba?\(253, 224, 71(?:, [0-9.]+)?\)/, 'La tecla objetivo no tiene el color de alto contraste');
    await page.locator('#repertoireTempo').evaluate(el => { el.value = '72'; el.dispatchEvent(new Event('input', { bubbles: true })); });
    assert.equal(await page.locator('#repertoireTempoLabel').innerText(), '72 BPM', 'El control de tempo no actualiza el valor visible');

    // Acortar la pieza solo en esta sesión de prueba para comprobar el cierre automático.
    await page.evaluate(() => {
      const piece = repertoireLibrary.find(item => item.id === 'rp10');
      piece.notes = [60, 62];
      piece.dur = [0.4, 0.4];
      selectLibraryPiece('rp10');
      setRepertoireTempo(140);
      playFullArrangement();
    });
    await page.waitForFunction(() => /frase 2 de 2/.test(document.getElementById('repertoireCurrentNoteHelp')?.textContent || ''), null, { timeout: 3000 });
    await page.waitForFunction(() => {
      const status = document.getElementById('backingTrackStatus');
      return status && /Terminó la canción/.test(status.textContent);
    }, null, { timeout: 5000 });
    const stopped = await page.evaluate(() => ({ backing: backingTrackTimer, guide: fullArrangementTimer }));
    assert.equal(stopped.backing, null, 'El acompañamiento siguió sonando al terminar la canción');
    assert.equal(stopped.guide, null, 'El temporizador de la melodía no se limpió al terminar');

    await page.evaluate(() => {
      const piece = repertoireLibrary.find(item => item.id === 'rp10');
      piece.notes = [60, 62, 64];
      piece.dur = [0.1, 0.1, 0.1];
      selectLibraryPiece('rp10');
      setRepertoireTempo(100);
      startBandPractice();
      pressKey(60, 'midi');
    });
    assert.match(await page.locator('#repertoireCurrentNoteName').innerText(), /Re \(D\)/, 'La nota objetivo no avanzó después de tocar la nota correcta');
    await page.evaluate(() => pressKey(64, 'midi'));
    assert.match(await page.locator('#repertoireCount').innerText(), /1 \/ 3/, 'Un error no quedó registrado en el conteo de la práctica');
    assert.match(await page.locator('#repertoireMsg').innerText(), /registró el error/i, 'La aplicación no explicó la nota incorrecta');
    await page.evaluate(() => pressKey(64, 'midi'));
    await page.waitForFunction(() => /Práctica terminada/.test(document.getElementById('backingTrackStatus')?.textContent || ''));
    const practiceResult = await page.evaluate(() => ({ count: repertoireInput.length, backing: backingTrackTimer, correct: bandPracticeResults.filter(x => x.correct).length, results: bandPracticeResults.length, summary: document.getElementById('repertoirePlayedNotes')?.textContent || '' }));
    assert.equal(practiceResult.count, 3, 'La práctica con banda no registró todas las notas tocadas');
    assert.equal(practiceResult.results, 3, 'La práctica no guardó el detalle de cada nota');
    assert.equal(practiceResult.correct, 2, 'El resultado de aciertos no distingue la nota incorrecta');
    assert.match(practiceResult.summary, /esperaba/i, 'El resumen final no identifica la nota esperada en el error');
    assert.equal(practiceResult.backing, null, 'El acompañamiento no se detuvo al completar la canción');

    await page.evaluate(() => {
      show('keyboard');
      if (!document.querySelector('.keys .key')) throw new Error('El mapa del teclado no renderizó teclas');
      show('practice');
      if (document.querySelectorAll('[data-free-exercise]').length < 8) throw new Error('La práctica libre no muestra una colección variada');
      changePianoLanguage('pt');
      show('practice');
    });
    const portuguesePractice = await page.locator('#main').innerText();
    assert.match(portuguesePractice, /Arpejo de Dó/, 'El repertorio de práctica libre no se tradujo al portugués');
    assert.match(portuguesePractice, /Mão esquerda/, 'El ejercicio de mano izquierda no se tradujo al portugués');
    await page.evaluate(() => changePianoLanguage('es'));

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
