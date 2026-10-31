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
        results.push({ id: lesson.id, kind: lesson.kind, engineMapped: typeof window[exerciseFunctionName(lesson.kind)] === 'function', rendered: !!main && html.length > 100, unimplemented: text.includes('Ejercicio no implementado'), interactive: !!main?.querySelector('button, .keys, input, [data-free-exercise]'), spanishLeak, spanishMatch, excerpt: spanishLeak ? text.slice(0, 240) : '' });
      }
      return { count: ids.length, unique: unique.size, results };
    });
    assert.equal(lessonAudit.count, 90, 'El catálogo no contiene exactamente 90 lecciones');
    assert.equal(lessonAudit.unique, 90, 'Hay IDs de lección duplicados');
    assert.equal(lessonAudit.results.length, 90, 'No se recorrieron las 90 lecciones');
    assert.deepEqual(lessonAudit.results.filter(x => !x.rendered || x.unimplemented || !x.interactive), [], 'Hay lecciones que no renderizan un ejercicio funcional: ' + JSON.stringify(lessonAudit.results.filter(x => !x.rendered || x.unimplemented || !x.interactive)));
    assert.deepEqual(lessonAudit.results.filter(x => !x.engineMapped), [], 'Hay motores de ejercicios sin mapear: ' + JSON.stringify(lessonAudit.results.filter(x => !x.engineMapped)));
    assert.deepEqual(lessonAudit.results.filter(x => x.spanishLeak), [], 'Hay instrucciones en español al recorrer lecciones en portugués: ' + JSON.stringify(lessonAudit.results.filter(x => x.spanishLeak)));

    await page.evaluate(() => changePianoLanguage('es'));

    // Evaluar que el nuevo nivel 3 enseña teoría y no acredita una respuesta incorrecta.
    const theoryCourseAudit = await page.evaluate(() => {
      state.day = 90;
      openLesson('l31');
      const rendered = document.getElementById('theoryCourseFeedback') && !!document.querySelector('.keys .key');
      answerTheoryCourse(1);
      const wrongRejected = !state.lessons.l31;
      theoryCourseLesson(LESSONS.find(item => item.id === 'l31'));
      answerTheoryCourse(0);
      return { rendered, wrongRejected, correctAccepted: !!state.lessons.l31, topics: THEORY_COURSE.length };
    });
    assert.equal(theoryCourseAudit.rendered, true, 'El nivel 3 no muestra teoría y teclado');
    assert.equal(theoryCourseAudit.wrongRejected, true, 'Una respuesta incorrecta aprobó teoría musical');
    assert.equal(theoryCourseAudit.correctAccepted, true, 'Una respuesta correcta no completó teoría musical');
    assert.equal(theoryCourseAudit.topics, 15, 'El nivel 3 no contiene 15 conceptos');

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
      state.skills = original;
      return { weakAutonomy, weakRhythm, balanced, floor: autonomyFloorScore };
    });
    assert.equal(autonomyGateAudit.weakAutonomy, 'guide', 'El promedio permitió retirar ayudas con autonomía sin demostrar');
    assert.equal(autonomyGateAudit.weakRhythm, 'reduced', 'Una competencia rítmica débil no limitó la ayuda');
    assert.equal(autonomyGateAudit.balanced, 'autonomous', 'El modo autónomo no se habilitó con todas las competencias altas');

    // El oído avanzado solo suma competencia tras una muestra de cinco respuestas y no permite duplicar una misma pregunta.
    const earEngineAudit = await page.evaluate(() => {
      const original = clone(state);
      state.skills.ear = 10;
      state.earAdvanced = { correct: 0, total: 0, byType: {}, skillMilestones: 0 };
      let duplicateAccepted = null;
      for (let i = 0; i < 5; i++) {
        const q = { type: 'quality', _answered: false, xp: 1 };
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
      state = original;
      saveState();
      return { guideForBeginner, guideForAdvanced, scored };
    });
    assert.equal(twoHandsMotorAudit.guideForBeginner, true, 'El principiante no ve la referencia de coordinación');
    assert.equal(twoHandsMotorAudit.guideForAdvanced, true, 'El motor no retira la guía al alumno competente');
    assert.deepEqual(twoHandsMotorAudit.scored, { left: 11, right: 11, chords: 11, memory: 7, autonomy: 8 }, 'La coordinación no acreditó ambas manos y acordes de forma independiente');

    const autonomyPanelAudit = await page.evaluate(() => {
      const html = godAutonomy();
      return { eightSkills: ['Lectura y orientación','Ritmo','Mano derecha','Mano izquierda','Acordes','Oído musical','Memoria','Autonomía'].every(x => html.includes(x)), weakest: html.includes('Competencia más débil'), mode: html.includes('Modo actual') };
    });
    assert.deepEqual(autonomyPanelAudit, { eightSkills: true, weakest: true, mode: true }, 'El panel del Motor 11 no muestra sus ocho competencias y el criterio de ayuda');

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
      return { firstPass, lateEntryMessage, extraAttackMessage, patterns: RHYTHM_PATTERNS.length, rests: RHYTHM_PATTERNS.filter(x => x.steps.some(s => s[0] === 'rest')).length, symbols: rhythmNotation(p) };
    });
    assert.match(rhythmAudit.firstPass.message, /Ritmo correcto/i, 'Un patrón rítmico exacto no fue aprobado');
    assert.equal(rhythmAudit.firstPass.delta, 2, 'La competencia rítmica no se acreditó una sola vez por patrón');
    assert.equal(rhythmAudit.firstPass.mastered.length, 1, 'No se guardó el patrón rítmico dominado');
    assert.match(rhythmAudit.lateEntryMessage, /antes del pulso|tarde|entrada/i, 'La evaluación no detectó una entrada fuera del primer pulso');
    assert.match(rhythmAudit.extraAttackMessage, /Faltan o sobran ataques/i, 'La evaluación permitió tocar durante un silencio');
    assert.equal(rhythmAudit.patterns, 6, 'La lectura rítmica no contiene seis patrones');
    assert.equal(rhythmAudit.rests, 2, 'No se enseñan silencios de negra y corchea');
    assert.match(rhythmAudit.symbols, /𝄽/, 'La notación no representa el silencio de negra');

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
