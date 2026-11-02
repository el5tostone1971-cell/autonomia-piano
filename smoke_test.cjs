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

    // En escritorio, el contenido principal debe quedar a la derecha del menú, sin superposición.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => show('practice'));
    const desktopLayout = await page.evaluate(() => {
      const side = document.querySelector('aside')?.getBoundingClientRect();
      const main = document.querySelector('.main')?.getBoundingClientRect();
      return { sideRight: side?.right, mainLeft: main?.left, mainWidth: main?.width };
    });
    assert.ok(desktopLayout.mainLeft >= desktopLayout.sideRight - 1, 'El menú lateral tapa el contenido principal');
    assert.ok(desktopLayout.mainWidth > 600, 'El contenido principal quedó demasiado estrecho en escritorio');


    // Prueba real de móvil: el documento no debe desbordarse horizontalmente y el teclado debe seguir siendo accesible.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { changePianoLanguage('es'); show('keyboard'); });
    const mobileLayout = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      keyboard: !!document.querySelector('.keys .key'),
      nav: document.querySelectorAll('#nav button').length,
      main: !!document.querySelector('#main'),
      overflowers: [...document.querySelectorAll('body *')].map(el => ({tag:el.tagName,id:el.id,cls:typeof el.className==='string'?el.className:'',left:Math.round(el.getBoundingClientRect().left),right:Math.round(el.getBoundingClientRect().right),width:Math.round(el.getBoundingClientRect().width),scroll:el.scrollWidth,client:el.clientWidth})).filter(x=>x.right>document.documentElement.clientWidth+2||x.left < -2).sort((a,b)=>b.right-a.right).slice(0,20)
    }));
    assert.ok(mobileLayout.document <= mobileLayout.viewport + 1, 'La interfaz móvil genera desplazamiento horizontal global: '+JSON.stringify(mobileLayout));
    assert.ok(mobileLayout.keyboard, 'El teclado virtual no aparece en móvil');
    assert.ok(mobileLayout.nav >= 10, 'El menú de navegación no conserva sus accesos en móvil');
    await page.evaluate(() => show('practice'));
    assert.ok(await page.locator('[data-free-exercise]').count() >= 8, 'La práctica libre no queda disponible en móvil');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.evaluate(() => show('repertoire'));
    assert.ok(await page.locator('#main').isVisible(), 'El contenido principal no aparece en tablet');

    // Emulación móvil real con pantalla táctil: navegación, toque de tecla y PWA offline.
    const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const touchPage = await touchContext.newPage();
    const touchErrors = [];
    touchPage.on('pageerror', error => touchErrors.push(error.message));
    try {
      await touchPage.goto(process.env.APP_URL || 'http://127.0.0.1:10000/', { waitUntil: 'domcontentloaded' });
      await touchPage.waitForFunction(() => typeof window.selectLibraryPiece === 'function', null, { timeout: 20000 });
      await touchPage.locator('#nav button[data-view="practice"]').tap();
      assert.equal(await touchPage.locator('[data-free-exercise]').count(), 9, 'La navegación táctil no abre las nueve prácticas');
      await touchPage.locator('#nav button[data-view="keyboard"]').tap();
      await touchPage.locator('.keys .key[data-midi="60"]').tap();
      assert.match(await touchPage.locator('#lastNote').innerText(), /Do4/, 'El toque táctil no ejecutó la nota en el teclado');
      const touchWidth = await touchPage.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
      assert.ok(touchWidth.document <= touchWidth.viewport + 1, 'El modo táctil móvil desborda el ancho de pantalla: ' + JSON.stringify(touchWidth));
      const pwa = await touchPage.evaluate(async () => {
        const manifest = await fetch('./manifest.webmanifest').then(response => response.json());
        const registration = await navigator.serviceWorker.register('./sw.js');
        await navigator.serviceWorker.ready;
        const cache = await caches.open('autonomia-piano-shell-v1');
        return { display: manifest.display, shortName: manifest.short_name, active: !!registration.active, cachedIndex: !!(await cache.match('./index.html')), cachedManifest: !!(await cache.match('./manifest.webmanifest')) };
      });
      assert.equal(pwa.display, 'standalone', 'El manifiesto no declara modo instalable');
      assert.equal(pwa.shortName, 'Autonomía Piano', 'El manifiesto no identifica la aplicación');
      assert.equal(pwa.active, true, 'El Service Worker no quedó activo');
      assert.equal(pwa.cachedIndex, true, 'La página principal no quedó en caché offline');
      assert.equal(pwa.cachedManifest, true, 'El manifiesto no quedó en caché offline');
      await touchContext.setOffline(true);
      await touchPage.reload({ waitUntil: 'domcontentloaded' });
      await touchPage.waitForFunction(() => typeof window.selectLibraryPiece === 'function', null, { timeout: 10000 });
      assert.match(await touchPage.title(), /Autonomía Piano/i, 'La aplicación no pudo abrirse sin conexión después de instalar el caché');
      await touchContext.setOffline(false);
      assert.deepEqual(touchErrors, [], 'La emulación táctil generó errores JavaScript: ' + touchErrors.join(' | '));
    } finally {
      await touchContext.close();
    }

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
    const targetKey = await page.locator('.keys.repertoireKeys .key[data-midi="60"]').evaluate(el => ({
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
      show('keyboard');
    });
    const portugueseMap = await page.locator('#main').innerText();
    assert.match(portugueseMap, /Mapa do teclado/, 'El mapa del teclado no tradujo su título al portugués');
    assert.match(portugueseMap, /As sete notas musicais/, 'La guía de notas no se tradujo al portugués');
    await page.evaluate(() => pressKey(60));
    const portugueseLastNote = await page.locator('#lastNote').innerText();
    assert.match(portugueseLastNote, /Dó \(C4\)/, 'La devolución dinámica de notas sigue en español');
    await page.evaluate(() => show('practice'));
    const portuguesePractice = await page.locator('#main').innerText();
    assert.match(portuguesePractice, /Arpejo de Dó/, 'El repertorio de práctica libre no se tradujo al portugués');
    assert.match(portuguesePractice, /Mão esquerda/, 'El ejercicio de mano izquierda no se tradujo al portugués');

    const freePracticeAudit = await page.evaluate(() => {
      const results = FREE_PRACTICE.map(exercise => {
        setFreePracticeExercise(exercise.id);
        startFreePractice();
        const expected = freePracticeExpected.slice();
        pressKey(expected[0]);
        const recorded = freePracticeInput[0] === expected[0];
        resetFreePractice();
        return { id: exercise.id, targetCount: expected.length, recorded };
      });
      setFreePracticeExercise('technique');
      startFreePractice();
      [61, 62, 64, 65, 67].forEach(note => pressKey(note));
      return {
        results,
        score: document.getElementById('freePracticeResult')?.textContent || '',
        detail: document.getElementById('freePracticeProgress')?.textContent || ''
      };
    });
    assert.equal(freePracticeAudit.results.length, 9, 'La práctica libre no contiene nueve actividades');
    assert.deepEqual(freePracticeAudit.results.filter(x => !x.targetCount || !x.recorded), [], 'Hay una actividad sin secuencia evaluable');
    assert.match(freePracticeAudit.score, /4\/5 corretas/, 'La práctica libre no calcula correctamente los errores');
    assert.match(freePracticeAudit.detail, /esperado Dó4/i, 'La práctica libre no identifica la nota esperada en portugués');
    const portugueseNav = await page.locator('#nav').innerText();
    assert.doesNotMatch(portugueseNav, /Lecciones|Práctica|Mapa del teclado|Teoría musical|Lectura musical|Tocar con dos manos|Frases musicales|Entrenamiento auditivo|Acompañamiento|Mi progreso|Repaso inteligente|Sistema y ajustes/, 'El menú conserva etiquetas principales en español');

    // Las seis guías pedagógicas deben existir también en portugués, no desaparecer al cambiar el idioma.
    await page.evaluate(() => {
      window._testMode = false;
      changePianoLanguage('pt');
      show('course');
      [1,16,31,46,61,76].forEach(day => {
        document.querySelector('.courseTeachingGuide')?.remove();
        const lesson = LESSONS.find(item => item.day === day);
        insertCourseTeachingGuide(lesson);
        const guide = document.querySelector('.courseTeachingGuide');
        if (!guide) throw new Error('A guia pedagógica não apareceu no nível ' + Math.ceil(day/15));
        const content = guide.innerText;
        for (const required of ['O que você precisa compreender','Como resolver este exercício','Erro frequente:','Critério de aprovação:']) {
          if (!content.includes(required)) throw new Error('A guia em português está incompleta: ' + required);
        }
        if (/Qué tenés|Cómo resolver|Error frecuente|Criterio de aprobación/.test(content)) throw new Error('A guia em português contém texto em espanhol');
      });
      window._testMode = false;
    });

    // Auditoría ampliada: los textos dinámicos de las pantallas también deben quedar en portugués.
    await page.evaluate(() => { state.theory = state.theory || { completed: {}, xp: 0 }; state.theory.completed = Object.fromEntries(THEORY_LESSONS.map(item => [item.id, true])); });
    await page.evaluate(() => show('course'));
    const portugueseCourse = await page.locator('#main').innerText();
    assert.match(portugueseCourse, /Curso de 90 dias/, 'El título del curso no se tradujo al portugués');
    assert.match(portugueseCourse, /Encontre todos os Dós/, 'El título de la primera lección no se tradujo');
    assert.match(portugueseCourse, /pronto para treinar|concluído/, 'El estado de las lecciones no se tradujo');

    await page.evaluate(() => show('reading'));
    const portugueseReading = await page.locator('#main').innerText();
    assert.match(portugueseReading, /Leitura musical/, 'La lectura musical no se tradujo');
    assert.match(portugueseReading, /Apagar a última/, 'El botón para borrar una nota no se tradujo');
    assert.doesNotMatch(portugueseReading, /Leé las|Tocá las|Esperando tu lectura|Esperando ejecución/, 'La lectura musical conserva instrucciones en español');

    await page.evaluate(() => show('repertoire'));
    const portugueseRepertoire = await page.locator('#main').innerText();
    assert.match(portugueseRepertoire, /Repertório progressivo/, 'El repertorio no se tradujo');
    assert.match(portugueseRepertoire, /Escolha uma música da biblioteca/, 'La instrucción inicial del repertorio no se tradujo');

    await page.evaluate(() => show('settings'));
    const portugueseSettings = await page.locator('#main').innerText();
    assert.match(portugueseSettings, /A versão gratuita funciona sem conta/, 'Los ajustes no se tradujeron');
    assert.match(portugueseSettings, /Executar autodiagnóstico completo/, 'El botón de autodiagnóstico no se tradujo');
    assert.doesNotMatch(portugueseSettings, /Tu progreso|No necesitás registrarte|Crear cuenta|Iniciar sesión/, 'Los ajustes conservan textos en español');

    // Revisar todas las pantallas del menú buscando instrucciones frecuentes que no deben quedar en español.
    const auditedViews = ['home','course','practice','repertoire','keyboard','theory','reading','rhythmReading','twoHands','phrases','technique','ear','earAdvanced','accompaniment','midiStudio','progress','spaced','teacher','resources','settings'];
    const spanishUiPattern = /\b(?:Tocá|Encontrá|Elegí|Practicá|Escuchá|Leé|Completá|Podés|Volvé|Mirá|Buscá|Aprendé|Entrená|Repasá|Lecciones|Práctica|Teoría musical|Mi progreso|Tu progreso|Sistema y ajustes|No necesitás|Empezá|creás|querés|Conectá|usá|Ingresá|sincronizás|vos|Empecemos)\b|Día \d|ningún dato sale|No reemplaza la práctica/i;
    for (const view of auditedViews) {
      await page.evaluate(viewName => show(viewName), view);
      const visibleText = await page.locator('#main').innerText();
      assert.doesNotMatch(visibleText, spanishUiPattern, 'La pantalla "' + view + '" conserva instrucciones o etiquetas en español');
    }

    // Auditoría automática de las 90 lecciones: cada ID debe abrir su ejercicio real.
    const lessonAudit = await page.evaluate(() => {
      state.day = 90; // Solo en el navegador de pruebas: permite abrir todos los días sin alterar datos reales.
      const ids = LESSONS.map(item => item.id);
      const unique = new Set(ids);
      const results = [];
      for (const lesson of LESSONS) {
        openLesson(lesson.id);
        const main = document.getElementById('main');
        const html = main?.innerHTML || '';
        const text = main?.innerText || '';
        const spanishPattern = /\b(?:Encontrá|Tocá|Completá|Escuchá|Memorizá|Recordá|Podés|Aprobás|Día \d+|Se evalúa|No alcanza|Volvé|Mirá|Ocultá|Técnica de hoy|sin detenerte|con pulso parejo)\b/i;
        const spanishMatch = text.match(spanishPattern)?.[0] || '';
        const spanishLeak = !!spanishMatch;
        const guide = main?.querySelector('.courseTeachingGuide');
        const guideText = guide?.innerText || '';
        const guideValid = !!guide && ['O que você precisa compreender','Como resolver este exercício','Erro frequente:','Critério de aprovação:'].every(label => guideText.includes(label));
        const guideSpanishLeak = /Qué tenés|Cómo resolver|Error frecuente|Criterio de aprobación/.test(guideText);
        results.push({ id: lesson.id, kind: lesson.kind, engineMapped: typeof window[exerciseFunctionName(lesson.kind)] === 'function', rendered: !!main && html.length > 100, unimplemented: text.includes('Ejercicio no implementado'), interactive: !!main?.querySelector('button, .keys, input, [data-free-exercise]'), spanishLeak, spanishMatch, guideValid, guideSpanishLeak, excerpt: spanishLeak ? text.slice(0, 240) : '' });
      }
      return { count: ids.length, unique: unique.size, results };
    });
    assert.equal(lessonAudit.count, 90, 'El catálogo no contiene exactamente 90 lecciones');
    assert.equal(lessonAudit.unique, 90, 'Hay IDs de lección duplicados');
    assert.equal(lessonAudit.results.length, 90, 'No se recorrieron las 90 lecciones');
    assert.deepEqual(lessonAudit.results.filter(x => !x.rendered || x.unimplemented || !x.interactive), [], 'Hay lecciones que no renderizan un ejercicio funcional: ' + JSON.stringify(lessonAudit.results.filter(x => !x.rendered || x.unimplemented || !x.interactive)));
    assert.deepEqual(lessonAudit.results.filter(x => !x.engineMapped), [], 'Hay motores de ejercicios sin mapear: ' + JSON.stringify(lessonAudit.results.filter(x => !x.engineMapped)));
    assert.deepEqual(lessonAudit.results.filter(x => x.spanishLeak), [], 'Hay instrucciones en español al recorrer lecciones en portugués: ' + JSON.stringify(lessonAudit.results.filter(x => x.spanishLeak)));
    assert.deepEqual(lessonAudit.results.filter(x => !x.guideValid || x.guideSpanishLeak), [], 'Hay guías pedagógicas ausentes o incompletas en portugués: ' + JSON.stringify(lessonAudit.results.filter(x => !x.guideValid || x.guideSpanishLeak)));

    await page.evaluate(() => changePianoLanguage('es'));

    // Evaluar que el nuevo nivel 3 enseña teoría y no acredita una respuesta incorrecta.
    const theoryCourseAudit = await page.evaluate(() => {
      state.day = 90;
      openLesson('l31');
      const rendered = document.getElementById('theoryCourseFeedback') && !!document.querySelector('.keys .key');
      answerTheoryCourse(1);
      const wrongRejected = !state.lessons.l31;
      theoryCourseLesson(LESSONS.find(item => item.id === 'l31'));
      answerTheoryCourse(THEORY_COURSE[0].a);
      const theoryOnlyNotComplete = !state.lessons.l31;
      theoryCoursePracticeExpected.forEach(note => registerTheoryCoursePracticeNote(note));
      checkTheoryCoursePractice();
      return { rendered, wrongRejected, theoryOnlyNotComplete, correctAccepted: !!state.lessons.l31, topics: THEORY_COURSE.length, practiceTopics: THEORY_COURSE_PRACTICE.length };
    });
    assert.equal(theoryCourseAudit.rendered, true, 'El nivel 3 no muestra teoría y teclado');
    assert.equal(theoryCourseAudit.wrongRejected, true, 'Una respuesta incorrecta aprobó teoría musical');
    assert.equal(theoryCourseAudit.theoryOnlyNotComplete, true, 'Una respuesta teórica completó la lección sin práctica de teclado');
    assert.equal(theoryCourseAudit.correctAccepted, true, 'La práctica correcta de teclado no completó la lección');
    assert.equal(theoryCourseAudit.topics, 15, 'El nivel 3 no contiene 15 conceptos');
    assert.equal(theoryCourseAudit.practiceTopics, 15, 'El nivel 3 no contiene 15 prácticas de teclado');

    // La lectura musical exige comprender la regla, nombrar el pentagrama y tocar la frase.
    const staffCourseAudit = await page.evaluate(() => {
      openLesson('l16');
      const rendered = !!document.getElementById('courseStaffTheoryFeedback') && !!document.querySelector('.staff') && !!document.querySelector('.keys .key');
      checkCourseStaff();
      const theoryGate = courseStaffStage === 'name';
      answerCourseStaffTheory(0);
      const wrongRejected = !state.lessons.l16;
      answerCourseStaffTheory(1);
      courseStaffExpected.forEach(note => nameCourseStaff(note));
      checkCourseStaff();
      const readingStageReached = courseStaffStage === 'play';
      courseStaffExpected.map(note => READING_MIDI[note]).forEach(note => registerCourseStaffNote(note));
      checkCourseStaff();
      return { rendered, theoryGate, wrongRejected, readingStageReached, completed: !!state.lessons.l16, topics: STAFF_THEORY.length };
    });
    assert.equal(staffCourseAudit.rendered, true, 'El nivel 2 no muestra teoría, pentagrama y teclado');
    assert.equal(staffCourseAudit.theoryGate, true, 'La lectura se habilitó sin teoría');
    assert.equal(staffCourseAudit.wrongRejected, true, 'Una respuesta incorrecta aprobó la teoría de lectura');
    assert.equal(staffCourseAudit.readingStageReached, true, 'No se habilitó la lectura tras responder teoría');
    assert.equal(staffCourseAudit.completed, true, 'La lectura y ejecución correctas no completaron la lección');
    assert.equal(staffCourseAudit.topics, 15, 'El nivel 2 no contiene 15 conceptos');


    // La armonía exige primero comprender el concepto y luego formar la progresión real.
    const chordCourseAudit = await page.evaluate(() => {
      openLesson('l46');
      checkGenericChords('l46');
      const theoryGate = !state.lessons.l46;
      answerChordTheory(0);
      [[60,64,67],[67,71,62],[69,60,64],[65,69,60]].forEach(chord => chord.forEach(note => registerChordNote(note)));
      checkGenericChords('l46');
      return { theoryGate, sequence: chordSequence.slice(), completed: !!state.lessons.l46, topics: CHORD_THEORY.length };
    });
    assert.equal(chordCourseAudit.theoryGate, true, 'La práctica de armonía se aprobó sin responder teoría');
    assert.deepEqual(chordCourseAudit.sequence, ['C','G','Am','F'], 'La detección de acordes no reconoció la progresión');
    assert.equal(chordCourseAudit.completed, true, 'La progresión correcta no completó la lección');
    assert.equal(chordCourseAudit.topics, 15, 'El nivel 4 no contiene 15 conceptos');



    // La autonomía solo se acredita con el desafío de memoria sin ayudas.
    await page.evaluate(() => {
      state.day = 90;
      openLesson('l12');
    });
    const autonomyBefore = await page.evaluate(() => ({ ready: autoChallengeReady, hidden: document.getElementById('autoHelp')?.classList.contains('hidden') || false }));
    assert.equal(autonomyBefore.ready, false, 'El desafío de autonomía se habilitó antes de retirar la ayuda');
    await page.evaluate(() => hideAutoHelp()); // Intento de saltarse los tres segundos.
    assert.equal(await page.evaluate(() => autoChallengeReady), false, 'Se permitió omitir el tiempo mínimo de observación');
    await page.waitForFunction(() => autoChallengeReady === true, null, { timeout: 5000 });
    const autonomyFailure = await page.evaluate(() => {
      autoInput = ['C'];
      checkPattern('l12', patternExpected, 'autonomy');
      return { inputLength: autoInput.length, completed: !!state.lessons.l12 };
    });
    assert.equal(autonomyFailure.inputLength, 0, 'Un intento incorrecto no reinició la respuesta');
    assert.equal(autonomyFailure.completed, false, 'Una respuesta incompleta acreditó autonomía');

    // Coordinar ambas manos o tocar una frase guiada no debe inflar memoria/autonomía.
    const falseAutonomyCredits = await page.evaluate(() => {
      const before = { autonomy: state.skills.autonomy, memory: state.skills.memory };
      twoHandsPhrase = TWO_HANDS_PHRASES[0];
      twoHandsStep = twoHandsPhrase.events.length;
      twoHandsAwarded = false;
      checkTwoHands();
      const afterTwoHands = { autonomy: state.skills.autonomy, memory: state.skills.memory };
      phrase = MUSICAL_PHRASES[0];
      phraseStep = phrase.events.length;
      phraseTimes = phrase.events.map((_, i) => i * (60000 / phrase.tempo));
      phraseAwarded = false;
      checkPhrase();
      return { before, afterTwoHands, afterPhrase: { autonomy: state.skills.autonomy, memory: state.skills.memory } };
    });
    assert.deepEqual(falseAutonomyCredits.afterTwoHands, falseAutonomyCredits.before, 'La coordinación de dos manos otorgó autonomía/memoria sin evaluarlas');
    assert.deepEqual(falseAutonomyCredits.afterPhrase, falseAutonomyCredits.before, 'La frase guiada otorgó autonomía/memoria sin evaluarlas');

    // El Motor 11 nunca debe ocultar ayudas por un promedio alto si una competencia sigue baja.
    const autonomyGateAudit = await page.evaluate(() => {
      const original = { ...state.skills };
      Object.keys(state.skills).forEach(key => { state.skills[key] = 100; });
      state.skills.autonomy = 0;
      const weakAutonomy = autonomyMode();
      state.skills.autonomy = 100;
      state.skills.rhythm = 40;
      const weakRhythm = autonomyMode();
      Object.keys(state.skills).forEach(key => { state.skills[key] = 80; });
      const balanced = autonomyMode();
      state.skills = { orientation:100, rhythm:100, right:100, left:100, chords:100, memory:100, autonomy:100, extra:100 };
      const missingSkill = { score: autonomyScore(), floor: autonomyFloorScore() };
      state.skills = original;
      return { weakAutonomy, weakRhythm, balanced, missingSkill };
    });
    assert.equal(autonomyGateAudit.weakAutonomy, 'guide', 'El promedio permitió retirar ayudas con autonomía sin demostrar');
    assert.equal(autonomyGateAudit.weakRhythm, 'reduced', 'Una competencia rítmica débil no limitó la ayuda');
    assert.equal(autonomyGateAudit.balanced, 'autonomous', 'El modo autónomo no se habilitó con todas las competencias altas');
    assert.deepEqual(autonomyGateAudit.missingSkill, { score: 88, floor: 0 }, 'El cálculo no mantuvo las ocho competencias fijas');

    // El oído avanzado solo suma competencia tras una muestra de cinco respuestas y no permite duplicar una misma pregunta.
    const earEngineAudit = await page.evaluate(() => {
      const original = clone(state);
      state.skills.ear = 10;
      state.earAdvanced = { correct: 0, total: 0, byType: {}, skillMilestones: 0 };
      let duplicateAccepted = null;
      for (let i = 0; i < 5; i++) {
        const q = { type: 'quality', playNotes: [60+i, 64+i, 67+i], _answered: false, xp: 1 };
        const accepted = recordEarAdvancedResult(q, i < 4);
        if (i === 0) duplicateAccepted = recordEarAdvancedResult(q, true);
      }
      const result = { ear: state.skills.ear, total: state.earAdvanced.total, correct: state.earAdvanced.correct, duplicateAccepted };
      state = original;
      saveState();
      return result;
    });
    assert.equal(earEngineAudit.ear, 12, 'El oído avanzado no acreditó el umbral de precisión del 80%');
    assert.equal(earEngineAudit.total, 5, 'El oído avanzado contó dos veces una pregunta o perdió intentos');
    assert.equal(earEngineAudit.correct, 4, 'El oído avanzado no registró las respuestas correctas');
    assert.equal(earEngineAudit.duplicateAccepted, false, 'Se pudo acreditar dos veces una misma pregunta');
    // La competencia de autonomía debe poder crecer con transferencias auditivas nuevas, pero nunca por repetir una lección ya aprobada.
    const autonomyTransferAudit = await page.evaluate(() => {
      const original = clone(state);
      state.day = 76;
      state.lessons = { ...(state.lessons || {}) };
      state.lessons.l76 = false;
      state.skills.autonomy = 12;
      state.skills.memory = 20;
      courseAutoLesson(LESSONS.find(x => x.id === 'l76'));
      courseAutoArmed = true;
      courseAutoPlayed = courseAutoExpected.slice();
      checkCourseAuto();
      const first = { autonomy: state.skills.autonomy, memory: state.skills.memory, completed: !!state.lessons.l76 };
      courseAutoLesson(LESSONS.find(x => x.id === 'l76'));
      courseAutoArmed = true;
      courseAutoPlayed = courseAutoExpected.slice();
      checkCourseAuto();
      const repeated = { autonomy: state.skills.autonomy, memory: state.skills.memory };
      state = original;
      saveState();
      return { first, repeated };
    });
    assert.deepEqual(autonomyTransferAudit.first, { autonomy: 17, memory: 22, completed: true }, 'La transferencia auditiva independiente no acreditó autonomía y memoria');
    assert.deepEqual(autonomyTransferAudit.repeated, { autonomy: 17, memory: 22 }, 'Repetir una lección ya aprobada infló las competencias');

    // La coordinación de dos manos debe adaptar la visibilidad de la guía y acreditar ambas manos, no solo acordes y derecha.
    const twoHandsMotorAudit = await page.evaluate(() => {
      const original = clone(state);
      const lesson = LESSONS.find(x => x.id === 'l61');
      Object.keys(state.skills).forEach(key => { state.skills[key] = 0; });
      courseTwoHandsLesson(lesson);
      const guideForBeginner = !document.getElementById('courseTwoHandsGuide')?.classList.contains('hidden');
      Object.keys(state.skills).forEach(key => { state.skills[key] = 80; });
      courseTwoHandsLesson(lesson);
      const guideForAdvanced = document.getElementById('courseTwoHandsGuide')?.classList.contains('hidden') || false;
      state.lessons.l61 = true;
      state.skills.left = 10; state.skills.right = 10; state.skills.chords = 10;
      state.skills.memory = 7; state.skills.autonomy = 8;
      courseTwoHandsLessonData = lesson;
      courseTwoHandsEvents = [{}]; courseTwoHandsStep = 1;
      checkCourseTwoHands();
      const scored = { left: state.skills.left, right: state.skills.right, chords: state.skills.chords, memory: state.skills.memory, autonomy: state.skills.autonomy };
      checkCourseTwoHands();
      const repeated = { left: state.skills.left, right: state.skills.right, chords: state.skills.chords };
      state = original;
      saveState();
      return { guideForBeginner, guideForAdvanced, scored, repeated };
    });
    assert.equal(twoHandsMotorAudit.guideForBeginner, true, 'El principiante no ve la referencia de coordinación');
    assert.equal(twoHandsMotorAudit.guideForAdvanced, true, 'El motor no retira la guía al alumno competente');
    assert.deepEqual(twoHandsMotorAudit.scored, { left: 11, right: 11, chords: 11, memory: 7, autonomy: 8 }, 'La coordinación no acreditó ambas manos y acordes de forma independiente');
    assert.deepEqual(twoHandsMotorAudit.repeated, { left: 11, right: 11, chords: 11 }, 'Repetir la misma lección infló las competencias de dos manos');

    // La memoria se acredita por rondas evaluadas, con umbral de precisión y bloqueo de doble contabilización.
    const memorySkillAudit = await page.evaluate(() => {
      const original = clone(state);
      const originalScored = memoryAttemptScored;
      state.skills.memory = 10;
      state.god = {};
      const rounds = [true, true, false];
      rounds.forEach(ok => { memoryAttemptScored = false; recordMemoryEvidence(ok); });
      const afterPassingBatch = { memory: state.skills.memory, attempts: state.god.memoryAssessment.attempts, correct: state.god.memoryAssessment.correct, batches: state.god.memoryAssessment.batches };
      const duplicateAccepted = recordMemoryEvidence(true);
      [false, false, false].forEach(ok => { memoryAttemptScored = false; recordMemoryEvidence(ok); });
      const afterFailingBatch = state.skills.memory;
      state = original;
      memoryAttemptScored = originalScored;
      saveState();
      return { afterPassingBatch, duplicateAccepted, afterFailingBatch };
    });
    assert.deepEqual(memorySkillAudit.afterPassingBatch, { memory: 12, attempts: 3, correct: 2, batches: 1 }, 'La memoria no acreditó una ronda de 2/3 respuestas correctas');
    assert.equal(memorySkillAudit.duplicateAccepted, false, 'Una misma ronda de memoria se pudo contabilizar dos veces');
    assert.equal(memorySkillAudit.afterFailingBatch, 12, 'La memoria aumentó después de una ronda insuficiente');

    // El modo de ayuda debe mostrar pistas progresivamente menores, no el mismo comportamiento para memoria y autonomía.
    const adaptiveGuidanceAudit = await page.evaluate(() => {
      const original = clone(state);
      const lesson = { seq: ['C','D','E','F','G'] };
      state.skills = { orientation:0, rhythm:0, right:0, left:0, chords:0, ear:0, memory:0, autonomy:0 };
      const guide = autonomyHelpForLesson(lesson);
      Object.keys(state.skills).forEach(key => { state.skills[key] = 40; });
      const reduced = autonomyHelpForLesson(lesson);
      Object.keys(state.skills).forEach(key => { state.skills[key] = 60; });
      const memory = autonomyHelpForLesson(lesson);
      Object.keys(state.skills).forEach(key => { state.skills[key] = 80; });
      const autonomous = autonomyHelpForLesson(lesson);
      const result = { guide: guide.text, reduced: reduced.text, memory: memory.text, autonomous: autonomous.text, autonomousHidden: !autonomous.show };
      state = original;
      saveState();
      return result;
    });
    assert.deepEqual(adaptiveGuidanceAudit, { guide: 'C · D · E · F · G', reduced: 'C · ? · E · ? · G', memory: 'C · ? · ? · ? · G', autonomous: 'C · ? · ? · ? · ?', autonomousHidden: true }, 'Los cuatro niveles de ayuda no reducen progresivamente las pistas');

    // La pantalla de una lección general debe usar la pista del Motor 11 y registrar solo la solicitud de ayuda.
    const genericGuidanceUiAudit = await page.evaluate(() => {
      const original = clone(state);
      state.skills = { orientation:60, rhythm:60, right:60, left:60, chords:60, ear:60, memory:60, autonomy:60 };
      state.god = {};
      genericLesson({ id:'motor-guidance-test', title:'Prueba adaptativa', desc:'Prueba de ayuda progresiva.', seq:['C','D','E','F','G'] });
      const target = document.getElementById('genericTarget');
      const initial = { text: target?.textContent, visible: !!target && !target.classList.contains('hidden') };
      toggleGenericHelp();
      const hidden = !!target?.classList.contains('hidden');
      toggleGenericHelp();
      const shownAgain = !!target && !target.classList.contains('hidden');
      const requests = state.god.autonomy?.helpRequests?.length || 0;
      state = original;
      saveState();
      return { initial, hidden, shownAgain, requests };
    });
    assert.deepEqual(genericGuidanceUiAudit, { initial: { text:'C · ? · ? · ? · G', visible:true }, hidden:true, shownAgain:true, requests:1 }, 'La lección general no aplicó la pista adaptativa o no registró la solicitud');

    // No se puede aprobar memoria mientras la secuencia siga visible; al ocultarla se habilita la evaluación.
    const memoryUiAudit = await page.evaluate(() => {
      const original = clone(state);
      state.lessons = { ...(state.lessons || {}), l4: false };
      state.skills.memory = 0;
      state.god = {};
      memoryLesson();
      checkMemory();
      const beforeHide = state.god.memoryAssessment?.attempts || 0;
      hideMemory();
      mem = memoryExpectedSeq.slice();
      checkMemory();
      const afterHide = { attempts: state.god.memoryAssessment?.attempts || 0, completed: !!state.lessons.l4, memory: state.skills.memory };
      state = original;
      saveState();
      return { beforeHide, afterHide };
    });
    assert.equal(memoryUiAudit.beforeHide, 0, 'Se pudo evaluar memoria antes de ocultar la secuencia');
    assert.deepEqual(memoryUiAudit.afterHide, { attempts: 1, completed: true, memory: 10 }, 'La memoria oculta no se evaluó o no acreditó la competencia inicial');
    assert.equal((await page.evaluate(() => (document.documentElement.innerHTML.match(/function genericLesson\(l\)/g) || []).length)), 1, 'Hay definiciones duplicadas de genericLesson');

    const autonomyPanelAudit = await page.evaluate(() => {
      const html = godAutonomy();
      return { eightSkills: ['Lectura y orientación','Ritmo','Mano derecha','Mano izquierda','Acordes','Oído musical','Memoria','Autonomía'].every(x => html.includes(x)), weakest: html.includes('Competencia más débil'), mode: html.includes('Modo actual') };
    });
    assert.deepEqual(autonomyPanelAudit, { eightSkills: true, weakest: true, mode: true }, 'El panel del Motor 11 no muestra sus ocho competencias y el criterio de ayuda');

    // Las nuevas pantallas de memoria y autonomía deben mostrar portugués cuando se selecciona ese idioma.
    const motorPortugueseAudit = await page.evaluate(() => {
      const oldLanguage=pianoLanguage;
      pianoLanguage='pt';
      memoryLesson();const memory=document.body.innerText;
      memory2Lesson();const memory2=document.body.innerText;
      autonomyLesson();const autonomy=document.body.innerText;
      clearTimeout(autoChallengeTimer);
      pianoLanguage=oldLanguage;
      return {memory,memory2,autonomy};
    });
    assert.match(motorPortugueseAudit.memory,/Primeira memória/i,'A primeira memória não foi traduzida para português');
    assert.match(motorPortugueseAudit.memory,/Ocultar ajuda/i,'O botão de ocultar ajuda não foi traduzido');
    assert.match(motorPortugueseAudit.memory2,/Memória com lacunas/i,'A memória com lacunas não foi traduzida');
    assert.match(motorPortugueseAudit.autonomy,/Desafio de autonomia/i,'O desafio de autonomia não foi traduzido');
    assert.match(motorPortugueseAudit.autonomy,/Verificar autonomia/i,'O botão de autonomia não foi traduzido');

    // El oído avanzado debe traducir las opciones y evaluar la respuesta portuguesa correcta.
    const earPortugueseAudit = await page.evaluate(() => {
      const original=clone(state),oldLanguage=pianoLanguage,oldQuestion=earAdvancedState.question,oldAnswer=earAdvancedState.answer,oldStarted=earAdvancedState.started,oldRandom=Math.random,oldTone=tone;
      pianoLanguage='pt';state.earAdvanced={correct:0,total:0,byType:{},seenStimuli:[]};
      earAdvancedState.question={...earAdvancedBank.find(q=>q.id==='ea1'),_answered:false};
      earAdvancedState.answer=[];earAdvancedState.started=false;
      const html=earAdvanced();showHTML(html);
      Math.random=()=>0.99;tone=()=>{};
      earAdvancedPlay();earAdvancedAnswer('Sobe');
      const result={labels:document.body.innerText,correct:state.earAdvanced.correct,total:state.earAdvanced.total};
      Math.random=oldRandom;tone=oldTone;pianoLanguage=oldLanguage;state=original;
      earAdvancedState.question=oldQuestion;earAdvancedState.answer=oldAnswer;earAdvancedState.started=oldStarted;
      saveState();return result;
    });
    assert.match(earPortugueseAudit.labels,/Ouvido avançado/i,'O título do ouvido avançado não foi traduzido');
    assert.match(earPortugueseAudit.labels,/Sobe/i,'A opção ascendente não foi traduzida');
    assert.match(earPortugueseAudit.labels,/Desce/i,'A opção descendente não foi traduzida');
    assert.match(earPortugueseAudit.labels,/Nova pergunta/i,'A ação de nova pergunta não foi traduzida');
    assert.match(earPortugueseAudit.labels,/Correto\./i,'O feedback da resposta correta não foi traduzido');
    assert.deepEqual({correct:earPortugueseAudit.correct,total:earPortugueseAudit.total},{correct:1,total:1},'A resposta correta em português não foi reconhecida');

    // Una secuencia de memoria idéntica no puede contabilizarse como evidencia nueva tras reiniciar.
    const memoryDuplicateAudit = await page.evaluate(() => {
      const original = clone(state), oldScored = memoryAttemptScored;
      state.god={};memoryAttemptScored=false;
      const first=recordMemoryEvidence(true,'CDEFG');
      memoryAttemptScored=false;
      const duplicate=recordMemoryEvidence(true,'CDEFG');
      const attempts=state.god.memoryAssessment.attempts;
      state=original;memoryAttemptScored=oldScored;saveState();
      return {first,duplicate,attempts};
    });
    assert.deepEqual(memoryDuplicateAudit,{first:true,duplicate:false,attempts:1},'Una secuencia de memoria repetida se acreditó más de una vez');

    // La lectura rítmica debe validar la entrada inicial, las duraciones y los silencios.
    const rhythmAudit = await page.evaluate(() => {
      const p = RHYTHM_PATTERNS.find(x => x.id === 'quarter-rest');
      rhythmReadingPattern = p;
      renderRhythmReading();
      rhythmReadingTimes = rhythmPatternAttacks(p).map(beat => beat * 600);
      const before = state.skills.rhythm;
      checkRhythmReading();
      const firstPass = { message: document.getElementById('rhythmReadingMsg')?.textContent || '', score: state.skills.rhythm, delta: state.skills.rhythm - before, mastered: state.god.rhythmAssessment?.mastered?.slice() || [] };
      rhythmReadingTimes = rhythmPatternAttacks(p).map(beat => beat * 600 + 1000); // Mismo intervalo entre notas, pero entrada un compás tarde.
      checkRhythmReading();
      const lateEntryMessage = document.getElementById('rhythmReadingMsg')?.textContent || '';
      rhythmReadingTimes = [0, 600, 1200, 1800, 2400]; // Cinco ataques: incluye un ataque indebido durante el silencio.
      checkRhythmReading();
      const extraAttackMessage = document.getElementById('rhythmReadingMsg')?.textContent || '';
      rhythmReadingPattern = RHYTHM_PATTERNS.find(x => x.id === 'eighth-rest');
      return { firstPass, lateEntryMessage, extraAttackMessage, patterns: RHYTHM_PATTERNS.length, rests: RHYTHM_PATTERNS.filter(x => x.steps.some(s => s[0] === 'rest')).length, meters: [...new Set(RHYTHM_PATTERNS.map(x => x.meter))], symbols: rhythmNotation(p) };
    });
    assert.match(rhythmAudit.firstPass.message, /Ritmo correcto/i, 'Un patrón rítmico exacto no fue aprobado');
    assert.equal(rhythmAudit.firstPass.delta, 2, 'La competencia rítmica no se acreditó una sola vez por patrón');
    assert.equal(rhythmAudit.firstPass.mastered.length, 1, 'No se guardó el patrón rítmico dominado');
    assert.match(rhythmAudit.lateEntryMessage, /antes del pulso|tarde|entrada/i, 'La evaluación no detectó una entrada fuera del primer pulso');
    assert.match(rhythmAudit.extraAttackMessage, /Faltan o sobran ataques/i, 'La evaluación permitió tocar durante un silencio');
    assert.equal(rhythmAudit.patterns, 11, 'La lectura rítmica no contiene once patrones');
    assert.deepEqual(rhythmAudit.meters.sort(), ['2/4','3/4','4/4','6/8'], 'La lectura rítmica no cubre los cuatro compases previstos');
    assert.equal(rhythmAudit.rests, 3, 'No se enseñan silencios de negra, corchea y contratiempo');
    assert.match(rhythmAudit.symbols, /𝄽/, 'La notación no representa el silencio de negra');

    // La misma evidencia musical no puede volver a inflar las competencias al reiniciar el ejercicio.
    const uniqueEvidenceAudit = await page.evaluate(() => {
      const original = clone(state);
      state.skills = { orientation:0, rhythm:0, right:0, left:0, chords:0, ear:0, memory:0, autonomy:0 };
      state.god = {};
      const first = awardUniqueSkillEvidence('phrases','p1',{right:3,left:3,rhythm:4});
      const duplicate = awardUniqueSkillEvidence('phrases','p1',{right:3,left:3,rhythm:4});
      const different = awardUniqueSkillEvidence('phrases','p2',{right:3,left:3,rhythm:4});
      const result = { first, duplicate, different, skills:{right:state.skills.right,left:state.skills.left,rhythm:state.skills.rhythm}, ledger:state.god.skillEvidence.phrases };
      state = original;
      saveState();
      return result;
    });
    assert.deepEqual(uniqueEvidenceAudit, { first:true, duplicate:false, different:true, skills:{right:6,left:6,rhythm:8}, ledger:['p1','p2'] }, 'La misma evidencia se pudo acreditar más de una vez o se bloqueó un ejercicio nuevo');

    // El entrenamiento auditivo debe producir acordes/progresiones con respuestas posibles y no acreditar el mismo sonido dos veces.
    const earVariationAudit = await page.evaluate(() => {
      const original = clone(state);
      const oldRandom = Math.random, oldTone = tone;
      tone = () => {};
      const chordAnswers = [];
      const progressionAnswers = [];
      try {
        ['chord','progression'].forEach(type => {
          [0,0.5,0.99].forEach(randomValue => {
            Math.random = () => randomValue;
            const q = { type, _answered:false };
            earAdvancedState.question = q;
            earAdvancedPlay();
            (type==='chord'?chordAnswers:progressionAnswers).push({
              answer:q.expectedAnswer,
              notes:q.playNotes,
              chords:q.playChords
            });
          });
        });
      } finally {
        Math.random = oldRandom;
        tone = oldTone;
      }
      state.earAdvanced = { correct:0,total:0,byType:{},seenStimuli:[] };
      const q1 = { type:'memory',playNotes:[60,62,64,62],_answered:false,xp:1 };
      const q2 = { type:'memory',playNotes:[60,62,64,62],_answered:false,xp:1 };
      const q3 = { type:'memory',playNotes:[60,64,67,64],_answered:false,xp:1 };
      const first = recordEarAdvancedResult(q1,true);
      const duplicate = recordEarAdvancedResult(q2,true);
      const newStimulus = recordEarAdvancedResult(q3,true);
      const result = {
        chordAnswers:chordAnswers.map(x=>x.answer),
        progressionAnswers:progressionAnswers.map(x=>x.answer),
        chordsHaveThreeNotes:chordAnswers.every(x=>x.chords.length===1&&x.chords[0].length===3),
        progressionsHaveFourChords:progressionAnswers.every(x=>x.chords.length===4&&x.chords.every(c=>c.length===3)),
        first,duplicate,newStimulus,
        scored:state.earAdvanced.total
      };
      state = original;
      saveState();
      return result;
    });
    assert.deepEqual(earVariationAudit.chordAnswers, ['Tónica','Dominante','Relativa menor'], 'El oído avanzado no genera las tres calidades de acorde');
    assert.deepEqual(earVariationAudit.progressionAnswers, ['I-V-vi-IV','I-vi-IV-V','vi-IV-I-V'], 'El oído avanzado no genera las tres progresiones');
    assert.equal(earVariationAudit.chordsHaveThreeNotes, true, 'Un acorde auditivo no contiene tres notas');
    assert.equal(earVariationAudit.progressionsHaveFourChords, true, 'Una progresión auditiva no contiene cuatro acordes');
    assert.deepEqual({first:earVariationAudit.first,duplicate:earVariationAudit.duplicate,newStimulus:earVariationAudit.newStimulus,scored:earVariationAudit.scored}, {first:true,duplicate:false,newStimulus:true,scored:2}, 'Se pudo puntuar dos veces el mismo estímulo auditivo');

    // Memoria y autonomía deben generar frases nuevas, y las pistas parciales deben corresponder a la frase real.
    const randomizedMemoryAudit = await page.evaluate(() => {
      const oldRandom = Math.random;
      let index = 0;
      const values = [0,0.2,0.4,0.6,0.8];
      Math.random = () => values[index++ % values.length];
      try {
        memoryLesson();
        const first = { seq:memoryExpectedSeq.slice(), visible:document.getElementById('memoryBox')?.textContent || '' };
        memory2Lesson();
        const second = { seq:memoryExpectedSeq.slice(), clue:document.querySelector('.memory')?.textContent || '' };
        autonomyLesson();
        const third = { seq:patternExpected.slice(), visible:document.getElementById('autoHelp')?.textContent || '' };
        clearTimeout(autoChallengeTimer);
        return { first,second,third };
      } finally {
        Math.random = oldRandom;
        clearTimeout(autoChallengeTimer);
      }
    });
    assert.equal(randomizedMemoryAudit.first.seq.length,5,'La memoria inicial no genera cinco notas');
    assert.equal(randomizedMemoryAudit.first.visible.replaceAll(' ','').replaceAll('·',''),randomizedMemoryAudit.first.seq.join(''),'La memoria inicial no muestra la secuencia que se evalúa');
    assert.equal(randomizedMemoryAudit.second.seq.length,7,'La memoria con huecos no genera siete notas');
    assert.equal(randomizedMemoryAudit.second.clue.split('·').length,7,'La memoria con huecos no muestra siete posiciones');
    assert.equal(randomizedMemoryAudit.third.seq.length,7,'El desafío de autonomía no genera siete notas');
    assert.equal(randomizedMemoryAudit.third.visible.replaceAll(' ','').replaceAll('·',''),randomizedMemoryAudit.third.seq.join(''),'La autonomía no muestra la secuencia que luego evalúa');

    // Los acordes del acompañamiento solo acreditan una vez cada posición de una progresión concreta.
    const chordEvidenceAudit = await page.evaluate(() => {
      const original = clone(state);
      const oldAccomp = { ...accomp, progression:accomp.progression.slice() };
      const oldPanel = document.getElementById('accDetected');
      const panel = document.createElement('div'); panel.id='accDetected'; document.body.appendChild(panel);
      state.skills.chords=0;state.god={};
      accomp.progression=['C','Am','F','G'];accomp.step=0;
      accChordFeedback('C');accChordFeedback('C');
      const afterDuplicate={score:state.skills.chords,ledger:state.god.skillEvidence?.accompaniment?.slice()||[]};
      accomp.step=1;accChordFeedback('Am');accChordFeedback('Am');
      const afterNext={score:state.skills.chords,ledger:state.god.skillEvidence?.accompaniment?.slice()||[]};
      accomp.step=2;accChordFeedback('G');
      const afterWrong=state.skills.chords;
      panel.remove();if(oldPanel)document.body.appendChild(oldPanel);
      state=original;Object.assign(accomp,oldAccomp);saveState();
      return {afterDuplicate,afterNext,afterWrong};
    });
    assert.deepEqual(chordEvidenceAudit.afterDuplicate,{score:1,ledger:['C-Am-F-G:0']},'El mismo acorde en el mismo paso sumó puntos más de una vez');
    assert.deepEqual(chordEvidenceAudit.afterNext,{score:2,ledger:['C-Am-F-G:0','C-Am-F-G:1']},'Un acorde correcto en un paso nuevo no fue acreditado');
    assert.equal(chordEvidenceAudit.afterWrong,2,'Un acorde incorrecto sumó puntos de competencia');

    // Las lecciones de acordes exigen C, G, Am y F; no se puede aprobar con cuatro acordes arbitrarios.
    const chordLessonAudit = await page.evaluate(() => {
      const oldComplete=complete,oldToast=toast,oldHits=chordHits,oldSequence=chordSequence;
      const completed=[],messages=[];
      complete=id=>completed.push(id);toast=message=>messages.push(String(message));
      chordHits=new Set(['D','Em','E','G']);chordSequence=[];
      checkChords('l6');const arbitraryAccepted=completed.includes('l6');
      chordHits=new Set(['C','G','Am','F']);chordSequence=[];
      checkChords('l6');const correctSetAccepted=completed.includes('l6');
      completed.length=0;chordSequence=['C','Am','G','F'];checkChords('l11');const wrongOrderAccepted=completed.includes('l11');
      completed.length=0;chordSequence=['C','G','Am','F'];checkChords('l11');const correctOrderAccepted=completed.includes('l11');
      complete=oldComplete;toast=oldToast;chordHits=oldHits;chordSequence=oldSequence;
      return {arbitraryAccepted,correctSetAccepted,wrongOrderAccepted,correctOrderAccepted};
    });
    assert.deepEqual(chordLessonAudit,{arbitraryAccepted:false,correctSetAccepted:true,wrongOrderAccepted:false,correctOrderAccepted:true},'La evaluación de acordes aceptó acordes incorrectos o rechazó la progresión correcta');

    // La misma frase auditiva no debe acreditar autonomía otra vez en otra lección.
    const autonomyPhraseAudit = await page.evaluate(() => {
      const original=clone(state),oldComplete=complete,oldLesson=courseAutoLessonData,oldExpected=courseAutoExpected.slice(),oldPlayed=courseAutoPlayed.slice(),oldArmed=courseAutoArmed;
      state.skills.autonomy=0;state.lessons={};state.god={};
      complete=id=>{state.lessons[id]=true};
      courseAutoExpected=[60,62,64];courseAutoPlayed=[60,62,64];courseAutoLessonData={id:'auto-a'};courseAutoArmed=true;checkCourseAuto();
      const first=state.skills.autonomy;
      courseAutoLessonData={id:'auto-b'};courseAutoExpected=[60,62,64];courseAutoPlayed=[60,62,64];courseAutoArmed=true;checkCourseAuto();
      const duplicate=state.skills.autonomy;
      courseAutoLessonData={id:'auto-c'};courseAutoExpected=[60,64,67];courseAutoPlayed=[60,64,67];courseAutoArmed=true;checkCourseAuto();
      const different=state.skills.autonomy;
      state=original;complete=oldComplete;courseAutoLessonData=oldLesson;courseAutoExpected=oldExpected;courseAutoPlayed=oldPlayed;courseAutoArmed=oldArmed;saveState();
      return {first,duplicate,different};
    });
    assert.deepEqual(autonomyPhraseAudit,{first:5,duplicate:5,different:10},'Una frase auditiva idéntica volvió a acreditar autonomía en otra lección');

    // La misma coordinación de manos no acredita otra vez si aparece en una lección distinta.
    const twoHandsEvidenceAudit = await page.evaluate(() => {
      const original=clone(state),oldComplete=complete,oldData=courseTwoHandsLessonData,oldEvents=courseTwoHandsEvents.slice(),oldStep=courseTwoHandsStep,oldStarted=courseTwoHandsStarted;
      state.skills.left=0;state.skills.right=0;state.skills.chords=0;state.god={};state.lessons={};
      complete=id=>{state.lessons[id]=true};
      const event={left:[48,52,55],right:60};
      courseTwoHandsEvents=[event];courseTwoHandsStep=1;courseTwoHandsLessonData={id:'th-a'};checkCourseTwoHands();
      const first={left:state.skills.left,right:state.skills.right,chords:state.skills.chords};
      courseTwoHandsLessonData={id:'th-b'};checkCourseTwoHands();
      const duplicate={left:state.skills.left,right:state.skills.right,chords:state.skills.chords};
      courseTwoHandsEvents=[{left:[48,52,55],right:62}];courseTwoHandsStep=1;courseTwoHandsLessonData={id:'th-c'};checkCourseTwoHands();
      const different={left:state.skills.left,right:state.skills.right,chords:state.skills.chords};
      state=original;complete=oldComplete;courseTwoHandsLessonData=oldData;courseTwoHandsEvents=oldEvents;courseTwoHandsStep=oldStep;courseTwoHandsStarted=oldStarted;saveState();
      return {first,duplicate,different};
    });
    assert.deepEqual(twoHandsEvidenceAudit,{first:{left:1,right:1,chords:1},duplicate:{left:1,right:1,chords:1},different:{left:2,right:2,chords:2}},'La misma frase de dos manos volvió a acreditar competencias en otra lección');

    // La guía de digitación no debe afirmar que detecta el dedo físico: solo puede verificar notas y pulso.
    const techniqueHonestyAudit = await page.evaluate(() => {
      const oldLanguage=pianoLanguage,oldExercise=techniqueExercise,oldStep=techniqueStep,oldStarted=techniqueStarted,oldTimes=techniqueTimes.slice(),oldAwarded=techniqueAwarded;
      techniqueExercise={hand:'Derecha',tempo:80,title:'Prueba de digitación',focus:'Prueba',notes:[60,62],fingers:[1,2]};
      techniqueStep=0;techniqueStarted=false;pianoLanguage='es';
      const spanish=techniqueView();
      pianoLanguage='pt';const portuguese=techniqueView();showHTML(portuguese);startTechnique();const startPrompt=document.getElementById('techniqueMsg')?.textContent||'';
      pianoLanguage=oldLanguage;techniqueExercise=oldExercise;techniqueStep=oldStep;techniqueStarted=oldStarted;techniqueTimes=oldTimes;techniqueAwarded=oldAwarded;
      return {spanish,portuguese,startPrompt};
    });
    assert.match(techniqueHonestyAudit.spanish,/no puede detectar qué dedo físico presionaste/i,'La guía de técnica promete detectar un dedo que la app no puede medir');
    assert.match(techniqueHonestyAudit.portuguese,/não consegue detectar qual dedo físico/i,'A explicação sobre dedilhado não foi localizada em português');
    assert.match(techniqueHonestyAudit.startPrompt,/Comece:/i,'O comando de início da técnica não foi traduzido');

    // Cambiar solo el dedo recomendado no crea evidencia nueva: el navegador no puede saber qué dedo físico se usó.
    const techniqueEvidenceAudit = await page.evaluate(() => {
      const original=clone(state),oldExercise=techniqueExercise,oldStep=techniqueStep,oldTimes=techniqueTimes.slice(),oldAwarded=techniqueAwarded,oldStarted=techniqueStarted;
      state.skills.right=0;state.god={};
      techniqueExercise={hand:'Derecha',tempo:80,title:'Prueba',focus:'',notes:[60,62],fingers:[1,2]};
      techniqueStep=2;techniqueTimes=[0,750];techniqueAwarded=false;techniqueStarted=true;checkTechnique();
      const first=state.skills.right;
      techniqueExercise={...techniqueExercise,fingers:[2,3]};techniqueStep=2;techniqueTimes=[0,750];techniqueAwarded=false;techniqueStarted=true;checkTechnique();
      const duplicate=state.skills.right;
      state=original;techniqueExercise=oldExercise;techniqueStep=oldStep;techniqueTimes=oldTimes;techniqueAwarded=oldAwarded;techniqueStarted=oldStarted;saveState();
      return {first,duplicate};
    });
    assert.deepEqual(techniqueEvidenceAudit,{first:3,duplicate:3},'Cambiar solo la digitación teórica volvió a sumar una habilidad que no puede medirse');

    // La recuperación/mezcla de respaldos debe conservar los registros que impiden volver a puntuar la misma evidencia.
    const evidenceMergeAudit = await page.evaluate(() => {
      const a=clone(defaultState),b=clone(defaultState);
      a.god.skillEvidence={phrases:['p1'],twoHands:['th1']};
      b.god.skillEvidence={phrases:['p2'],courseAuto:['seq1']};
      a.god.twoHandsAssessment=['l61'];b.god.twoHandsAssessment=['l62'];
      a.god.memoryAssessment={attempts:2,correct:1,batchAttempts:2,batchCorrect:1,batches:0,skillPoints:0,seenSequences:['CDEFG']};
      b.god.memoryAssessment={attempts:3,correct:2,batchAttempts:0,batchCorrect:0,batches:1,skillPoints:2,seenSequences:['CDEFGAB']};
      a.god.rhythmAssessment={mastered:['q4']};b.god.rhythmAssessment={mastered:['e8']};
      a.earAdvanced={correct:2,total:3,skillMilestones:0,seenStimuli:['stim-a'],byType:{direction:{correct:1,total:2}}};
      b.earAdvanced={correct:3,total:4,skillMilestones:1,seenStimuli:['stim-b'],byType:{direction:{correct:2,total:3}}};
      const merged=mergeProgressStates(a,b);
      return {
        evidence:merged.god.skillEvidence,
        twoHands:merged.god.twoHandsAssessment,
        memory:merged.god.memoryAssessment,
        rhythm:merged.god.rhythmAssessment.mastered,
        ear:merged.earAdvanced
      };
    });
    assert.deepEqual(evidenceMergeAudit.evidence,{phrases:['p1','p2'],twoHands:['th1'],courseAuto:['seq1']},'La mezcla de respaldos perdió registros de evidencia única');
    assert.deepEqual(evidenceMergeAudit.twoHands,['l61','l62'],'La mezcla de respaldos perdió lecciones de dos manos ya acreditadas');
    assert.deepEqual(evidenceMergeAudit.memory.seenSequences,['CDEFG','CDEFGAB'],'La mezcla de respaldos permitió repetir secuencias de memoria');
    assert.deepEqual(evidenceMergeAudit.rhythm,['q4','e8'],'La mezcla de respaldos perdió patrones rítmicos dominados');
    assert.deepEqual(evidenceMergeAudit.ear.seenStimuli,['stim-a','stim-b'],'La mezcla de respaldos permitió repetir estímulos de oído');

    // La coordinación de dos manos exige el pulso, no solo reunir las notas correctas.
    const twoHandsTimingAudit = await page.evaluate(() => {
      const original=clone(state),oldPhrase=twoHandsPhrase,oldStep=twoHandsStep,oldTimes=twoHandsTimes.slice(),oldAwarded=twoHandsAwarded,oldStarted=twoHandsStarted;
      state.skills.left=0;state.skills.right=0;state.skills.chords=0;state.god={};
      const oldMessage=document.getElementById('twoHandsMsg'),message=document.createElement('div');message.id='twoHandsMsg';document.body.appendChild(message);
      twoHandsPhrase=MUSICAL_PHRASES[0];twoHandsStep=twoHandsPhrase.events.length;twoHandsAwarded=false;twoHandsStarted=true;
      twoHandsTimes=Array.from({length:8},(_,i)=>i*833);
      checkTwoHands();
      const onBeat={left:state.skills.left,right:state.skills.right,chords:state.skills.chords};
      twoHandsStep=twoHandsPhrase.events.length;twoHandsAwarded=false;twoHandsStarted=true;
      twoHandsTimes=[0,833,1666,4000,4833,5666,6499,7332];
      checkTwoHands();
      const offBeat={left:state.skills.left,right:state.skills.right,chords:state.skills.chords,message:document.getElementById('twoHandsMsg')?.textContent||''};
      message.remove();if(oldMessage)document.body.appendChild(oldMessage);state=original;twoHandsPhrase=oldPhrase;twoHandsStep=oldStep;twoHandsTimes=oldTimes;twoHandsAwarded=oldAwarded;twoHandsStarted=oldStarted;saveState();
      return {onBeat,offBeat};
    });
    assert.deepEqual(twoHandsTimingAudit.onBeat,{left:3,right:3,chords:2},'Una coordinación a tempo no acreditó ambas manos y acordes');
    assert.deepEqual({left:twoHandsTimingAudit.offBeat.left,right:twoHandsTimingAudit.offBeat.right,chords:twoHandsTimingAudit.offBeat.chords},{left:3,right:3,chords:2},'Una frase fuera de pulso sumó competencias como si estuviera coordinada');
    assert.match(twoHandsTimingAudit.offBeat.message,/pulso|acelerando|atrasan/i,'La evaluación no explicó el error de pulso');

    // La práctica de dos manos también debe localizar su pantalla y las instrucciones dinámicas al portugués.
    const twoHandsPortugueseAudit = await page.evaluate(() => {
      const oldLanguage=pianoLanguage,oldPhrase=twoHandsPhrase,oldStep=twoHandsStep,oldWindow=twoHandsWindow.slice(),oldStarted=twoHandsStarted;
      pianoLanguage='pt';twoHandsPhrase=TWO_HANDS_PHRASES[0];twoHandsStep=0;twoHandsWindow=[];twoHandsStarted=false;
      showHTML(twoHandsView());const screen=document.body.innerText;
      startTwoHands();const prompt=document.getElementById('twoHandsMsg')?.textContent||'';
      clearTimeout(twoHandsWindowTimer);pianoLanguage=oldLanguage;twoHandsPhrase=oldPhrase;twoHandsStep=oldStep;twoHandsWindow=oldWindow;twoHandsStarted=oldStarted;
      return {screen,prompt};
    });
    assert.match(twoHandsPortugueseAudit.screen,/Duas mãos/i,'A tela de coordenação de duas mãos não foi traduzida');
    assert.match(twoHandsPortugueseAudit.screen,/Progressão/i,'A indicação da progressão não foi traduzida');
    assert.match(twoHandsPortugueseAudit.screen,/Nova frase/i,'O botão de nova frase não foi traduzido');
    assert.match(twoHandsPortugueseAudit.prompt,/Comece pelo primeiro bloco/i,'A instrução dinâmica de início não foi traduzida');

    // Simular progreso y recarga en el mismo navegador.
    await page.evaluate(() => {
      state.lessons = { ...(state.lessons || {}), l1: true };
      selectLibraryPiece('rp10');
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
    await page.evaluate(() => { selectLibraryPiece('rp10'); startRepertoireLearn(); });
    const resumedLearn = await page.evaluate(() => ({ index: repertoireLearnIndex, count: document.getElementById('repertoireCount')?.textContent || '', note: document.getElementById('repertoireCurrentNoteName')?.textContent || '' }));
    assert.equal(resumedLearn.index, 3, 'El aprendizaje no retomó desde la cuarta nota');
    assert.match(resumedLearn.count, /^3 \/ /, 'El contador de aprendizaje no refleja las notas ya realizadas');
    assert.match(resumedLearn.note, /octava/i, 'La nota de reanudación no se mostró');
    await page.evaluate(() => {
      const piece = repertoireLibrary.find(item => item.id === 'rp10');
      repertoireInput = piece.notes.slice(0, 2);
      saveRepertoireSession('play', 2);
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof window.selectLibraryPiece === 'function', null, { timeout: 20000 });
    await page.evaluate(() => { selectLibraryPiece('rp10'); startRepertoire(); });
    const resumedPlay = await page.evaluate(() => ({ notes: repertoireInput.slice(), count: document.getElementById('repertoireCount')?.textContent || '' }));
    assert.equal(resumedPlay.notes.length, 2, 'La interpretación no recuperó las dos notas guardadas');
    await page.evaluate(() => stopRepertoirePractice());
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
