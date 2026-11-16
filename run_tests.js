(async()=>{
 const results=[]; const pass=(name,detail='')=>results.push({ok:true,name,detail}); const fail=(name,e)=>results.push({ok:false,name,detail:String(e?.stack||e)});
 const assert=(c,m)=>{if(!c)throw Error(m)};
 window._testMode=true;
 try{
  // Clean deterministic state.
  localStorage.clear(); state=clone(defaultState); state.day=1; state.lessons={}; state.god.spaced.queue=[]; saveState();
  const midi=(pc,oct=4)=>12*(oct+1)+NOTE_NAMES.indexOf(pc);
  const playSeqTest=(seq)=>seq.forEach(n=>pressKey(n,'test'));
  const completeCourseLesson=async(l)=>{
    openLesson(l.id);
    switch(l.id){
      case 'l1': playSeqTest([48,60,72,84]); break;
      case 'l2': playSeqTest(['C','D','E','F','G','F','E','D','C'].map(x=>midi(x))); checkPattern('l2',patternExpected,'right'); break;
      case 'l3': rhythmTimes=[0,600,1200,1800]; checkRhythm('l3'); break;
      case 'l4': memoryExpectedSeq=['C','D','E','D','C'];hideMemory();playSeqTest(memoryExpectedSeq.map(x=>midi(x)));checkMemory();break;
      case 'l5': earRound=[60,62,64]; earInput=['C','D','E']; checkEar(); completeEarAndContinue(); break;
      case 'l6': [['C',[60,64,67]],['G',[55,59,62]],['Am',[57,60,64]],['F',[53,57,60]]].forEach(([_,ns])=>playSeqTest(ns)); checkChords('l6'); break;
      case 'l7': playSeqTest([48,43,45,41]); checkPattern('l7',[48,43,45,41],'left'); break;
      case 'l8': playSeqTest(['C','D','E','G'].map(x=>midi(x,4))); playSeqTest(['C','G','A','F'].map(x=>midi(x,3))); checkSeparate('l8'); break;
      case 'l9': pattern=patternExpected.slice();checkPattern('l9',patternExpected,'memory2');break;
      case 'l10': playSeqTest(['C','D','E','G','E','D','C'].map(x=>midi(x))); rhythmTimes=[0,600,1200,1800,2400,3000,3600]; checkRhythm2('l10'); break;
      case 'l11': chordSequence=['C','G']; chordHits=new Set(['C','G']); checkChords('l11'); break;
      case 'l12': autoChallengeReady=true;autoInput=patternExpected.slice();checkPattern('l12',patternExpected,'autonomy');clearTimeout(autoChallengeTimer);break;
      case 'l13': orientationCourseExpected.forEach(note=>registerOrientationCourseNote(note)); break;
      case 'l14': pulseCourseStartedAt=performance.now();pulseCourseTimes=Array.from({length:8},(_,i)=>pulseCourseStartedAt+i*600);pulseCourseArmed=true;checkPulseCourse();break;
      case 'l15': echoCourseInput=echoCourseExpected.slice();checkEchoCourse();break;
      default:
        if(l.kind==='staffcourse'){
          answerCourseStaffTheory(STAFF_THEORY[l.staffTheoryIndex].a);
          courseStaffExpected.forEach(note=>nameCourseStaff(note));
          checkCourseStaff();
          courseStaffExpected.map(note=>READING_MIDI[note]).forEach(note=>registerCourseStaffNote(note));
          checkCourseStaff();
        }else if(l.kind==='theorycourse'){
          answerTheoryCourse(THEORY_COURSE[l.theoryIndex].a);assert(!state.lessons[l.id],'la teoría se completó sin práctica de teclado');theoryCoursePracticeExpected.forEach(note=>registerTheoryCoursePracticeNote(note));checkTheoryCoursePractice();
        }else if(l.kind==='chordgeneric'){
          answerChordTheory(CHORD_THEORY[l.chordTheoryIndex].a);
          chordSequence=l.targetChords.slice();checkGenericChords(l.id);
        }else if(l.kind==='courseTwoHands'){
          startCourseTwoHands();
          courseTwoHandsEvents.forEach(event=>event.left.concat(event.right).forEach(note=>registerCourseTwoHandsNote(note)));
          checkCourseTwoHands();
        }else if(l.kind==='courseAuto'){
          courseAutoCanAnswer=true;armCourseAuto();courseAutoPlayed=courseAutoExpected.slice();checkCourseAuto();
        }else{
          pattern=l.seq.slice();checkGeneric(l.id);
        }
    }
    clearTimeout(window._nextTimer); await new Promise(r=>setTimeout(r,5));
    assert(!!state.lessons[l.id],`no quedó completada: ${l.id}`);
  };
  for(const l of LESSONS) await completeCourseLesson(l);
  assert(state.day===90,'Día final esperado 90, obtenido '+state.day);
  const levels=Array.from({length:6},(_,i)=>LESSONS.filter(lesson=>Math.ceil(lesson.day/15)===i+1));
  assert(levels.every(level=>level.length===15),'los seis niveles no contienen exactamente 15 lecciones cada uno');
  assert(new Set(LESSONS.map(lesson=>lesson.id)).size===90,'hay identificadores duplicados');
  assert(LESSONS.every(lesson=>lesson.title&&lesson.desc&&lesson.desc.length>=20&&exerciseFunctionName(lesson.kind)&&typeof window[exerciseFunctionName(lesson.kind)]==='function'),'hay lecciones sin explicación o motor asignado');
  pass('90/90 ejercicios del curso','seis niveles de 15; cada lección aprobada con su motor real y metadatos completos');
 }catch(e){fail('90/90 ejercicios del curso',e)}

 // Portuguese audit: all ninety lesson titles and descriptions must not retain Rioplatense Spanish imperatives.
 try{
  const oldLanguage=pianoLanguage,spanishImperatives=/\b(?:Encontrá|Tocá|Escuchá|Usá|Leé|Explicá|Estudiá|Observá|Resolvé|Prepará|Uní|Mantené|Anticipá|Detectá|Corregí|Combiná|Memorizá|Ocultá|Regresá|Trasladá|Cantalo|Reproducilo|Evitá|Cerrá|Borrá|Volvé|Repetí|Practicá|Construí|Formá|Contá|Ubicá|Nombrá|Marcá|Compará|Dejá|Apoyá|Soltá|Seguí|Aprendé|Comprendé|Elegí|Trabajá|Reconocé|Identificá|Subí|Bajá)\b/i,leftovers=[];
  try{pianoLanguage='pt';for(const lesson of LESSONS){for(const [field,raw] of [['title',lesson.title],['desc',lesson.desc]]){const translated=pianoTranslateText(raw),match=translated.match(spanishImperatives);if(match)leftovers.push({id:lesson.id,field,word:match[0],text:translated})}}}finally{pianoLanguage=oldLanguage}
  assert(leftovers.length===0,'Hay textos de lecciones en portugués que conservan imperativos españoles: '+JSON.stringify(leftovers.slice(0,8)));
  pass('Português · 90 lições','títulos y descripciones sin imperativos rioplatenses');
 }catch(e){fail('Português · 90 lições',e)}

 // Render every course card in Portuguese and verify labels, translated title/description and action text.
 try{
  const oldLanguage=pianoLanguage,labels={orientation:'Orientação',right:'Mão direita',left:'Mão esquerda',rhythm:'Ritmo',memory:'Memória',ear:'Ouvido',chords:'Acordes',autonomy:'Autonomia'},issues=[];
  try{pianoLanguage='pt';for(const lesson of LESSONS){const html=lessonCard(lesson);showHTML(html);const text=document.querySelector('#main').innerText||'',normalizedText=text.toLocaleLowerCase('pt-BR'),expectedTitle=pianoTranslateText(lesson.title),expectedDesc=pianoTranslateText(lesson.desc),skill=labels[lesson.skill]||lesson.skill,debug={id:lesson.id,language:pianoLanguage,html:html.slice(0,220),rendered:text.slice(0,220)};if(!normalizedText.includes(('Dia '+lesson.day).toLocaleLowerCase('pt-BR')))issues.push({...debug,issue:'day label'});if(!normalizedText.includes(('· '+skill).toLocaleLowerCase('pt-BR')))issues.push({...debug,issue:'skill label',skill});if(!text.includes(expectedTitle)||!text.includes(expectedDesc))issues.push({...debug,issue:'title/description not rendered in Portuguese'});if(!text.includes('Treinar')&&!text.includes('Revisar'))issues.push({...debug,issue:'action label'})}}finally{pianoLanguage=oldLanguage}
  assert(issues.length===0,'Há cartões de lição incompletos em português: '+JSON.stringify(issues.slice(0,10)));
  pass('Cartões das 90 lições em português','dia, competência, título, descrição e ação localizados');
 }catch(e){fail('Cartões das 90 lições em português',e)}

 // Theory academy: audit every lesson's content, concrete piano application, illustration, quiz and level assignment.
 try{
  const expectedIds=Array.from({length:90},(_,i)=>'T'+String(i+1).padStart(2,'0'));
  assert(THEORY_LESSONS.length===90,'la academia no contiene 90 lecciones');
  assert(new Set(THEORY_LESSONS.map(x=>x.id)).size===90,'hay identificadores teóricos duplicados');
  assert(THEORY_LESSONS.map(x=>x.id).slice().sort((a,b)=>Number(a.slice(1))-Number(b.slice(1))).every((id,i)=>id===expectedIds[i]),'los identificadores teóricos no cubren T01–T90 sin huecos');
  assert(THEORY_LEVELS.length===6&&THEORY_LEVELS.every(level=>level.lessons.length===15),'la teoría no está distribuida en seis niveles de quince');
  const issues=[];
  for(const lesson of THEORY_LESSONS){
   if(!lesson.title||!lesson.text||lesson.text.length<45||!lesson.rule||lesson.rule.length<12)issues.push(lesson.id+': explicación/regla incompleta');
   if(!lesson.question||!Array.isArray(lesson.options)||lesson.options.length<3||!Number.isInteger(lesson.correct)||lesson.correct<0||lesson.correct>=lesson.options.length)issues.push(lesson.id+': pregunta u opciones inválidas');
   if(!THEORY_PRACTICE_ES[lesson.id]||THEORY_PRACTICE_ES[lesson.id].length<45)issues.push(lesson.id+': falta práctica específica de piano');
   if(!THEORY_DEEP_ES[lesson.id]||THEORY_DEEP_ES[lesson.id].length<35)issues.push(lesson.id+': falta explicación profunda específica');
   openTheory(lesson.id);
   const rendered=document.getElementById('main')?.innerText||'';
   if(!rendered.includes(lesson.title)||!rendered.includes(THEORY_PRACTICE_ES[lesson.id]||'__missing__')||!rendered.includes(lesson.question))issues.push(lesson.id+': contenido no renderizado');
   if(!rendered.includes('Demostración práctica en el piano')||!rendered.includes('Comprobación de comprensión')||!rendered.includes('Iniciar prueba práctica'))issues.push(lesson.id+': faltan secciones pedagógicas o evaluación práctica');
    const spec=theoryPracticeSpec(lesson);if(!spec||!Array.isArray(spec.notes)||spec.notes.length<2||!spec.prompt)issues.push(lesson.id+': desafío práctico incompleto');
  }
  assert(issues.length===0,'auditoría de teoría encontró problemas: '+issues.slice(0,12).join(' | '));
  state.theory={completed:{},practice:{},xp:0};state.xp=0;openTheory('T01');
  answerTheory('T01',THEORY_LESSONS[0].correct);
  assert(!theoryDone('T01')&&state.theory.xp===0,'una respuesta correcta sin práctica completó teoría');
  startTheoryAcademyPractice('T01');theoryAcademyPracticeExpected.forEach(n=>pressKey(n,'test'));
  assert(checkTheoryAcademyPractice()===true&&state.theory.practice.T01.passed,'la ejecución correcta no acreditó la práctica');
  answerTheory('T01',1-THEORY_LESSONS[0].correct);
  assert(!theoryDone('T01')&&state.theory.xp===0,'una respuesta incorrecta completó teoría o sumó XP');
  answerTheory('T01',THEORY_LESSONS[0].correct);
  assert(theoryDone('T01')&&state.theory.xp===10,'la práctica + respuesta correcta no completó la lección');
  const theoryReload=loadState();assert(theoryReload.theory.practice.T01?.passed&&theoryReload.theory.completed.T01,'la práctica aprobada no sobrevivió a la recarga');
  pass('Academia de teoría · 90 lecciones','90 desafíos prácticos, ejecución en teclado obligatoria, pregunta de comprensión y progreso condicionado a ambas pruebas');
 }catch(e){fail('Academia de teoría · 90 lecciones',e)}

 // Public spaced repetition regression test.
 try{
  state=clone(defaultState); state.day=3; state.lessons={l1:true,l2:true,l3:true}; state.god.spaced.queue=[]; saveState();
  show('spaced'); seedSpaced();
  assert(document.querySelector('#main').textContent.includes('Repasos pendientes'),'la vista de repaso no renderizó');
  const first=state.god.spaced.queue[0]; assert(first && first.dueAt,'no se creó una revisión');
  first.dueAt=new Date(Date.now()-86400000).toISOString(); show('spaced');
  assert(document.querySelector('#main').textContent.includes('Pendiente de repaso'),'no aparece una revisión vencida');
  const oldIndex=first.intervalIndex; spacedReview(first.id,true);
  assert(first.intervalIndex===Math.min(5,oldIndex+1),'no avanzó el intervalo al aprobar');
  assert(document.querySelector('#main').textContent.includes('Repaso espaciado'),'no volvió a la vista pública de repaso');
  first.dueAt=new Date(Date.now()-86400000).toISOString(); spacedReview(first.id,false);
  assert(first.intervalIndex===Math.max(0,oldIndex),'no redujo el intervalo al fallar');
  pass('Repaso espaciado','crear → vencer → aprobar → fallar funciona');
 }catch(e){fail('Repaso espaciado',e)}

 // Smoke all main exercise views.
 try{
  const views=['home','course','practice','reading','rhythmReading','twoHands','phrases','technique','midiStudio','repertoire','ear','earAdvanced','accompaniment','progress','teacher','spaced','resources','settings'];
  for(const v of views){show(v);assert(document.getElementById('main')?.innerHTML.length>0,`vista vacía: ${v}`)}
  pass('18 vistas principales','todas renderizan');
 }catch(e){fail('18 vistas principales',e)}

 // Reading: verify octaves remain visible in the learner's submitted sequence and duplicate phrases do not farm skill points.
 try{show('reading');readingExpectedSeq=['C4','C5'];readingStage='name';readingNamedSeq=['C4','C5'];assert(readingView().includes('Do4 · Do5'),'la secuencia visual oculta la octava');readingExpectedSeq=['C4'];readingStage='play';readingPlayedSeq=[60];const before=state.skills.orientation||0;checkReading();assert(readingStage==='done','respuesta correcta no aceptada');const credited=state.skills.orientation||0;readingExpectedSeq=['C4'];readingStage='play';readingPlayedSeq=[60];checkReading();assert((state.skills.orientation||0)===credited,'la misma frase volvió a sumar puntos');assert(credited>=before,'el progreso se redujo');pass('Lectura musical','octavas visibles + acreditación única por frase')}catch(e){fail('Lectura musical',e)}
 // Rhythm reading: the current rhythm model stores steps (note/rest + duration), not a legacy beats array.
 try{showHTML(rhythmReadingView());newRhythmReading();renderRhythmReading();rhythmReadingCountdownTimer=setTimeout(()=>{},10000);rhythmReadingArmed=true;newRhythmReading();assert(rhythmReadingCountdownTimer===null&&!rhythmReadingArmed,'Nueva lectura no canceló el conteo pendiente');const rhythmUnit=rhythmQuarterDurationMs();const rhythmTotals=RHYTHM_PATTERNS.map(pattern=>({id:pattern.id,total:pattern.steps.reduce((sum,step)=>sum+step[1],0),expected:Number(pattern.meter.split('/')[0])*4/Number(pattern.meter.split('/')[1])}));assert(rhythmTotals.every(item=>Math.abs(item.total-item.expected)<0.001),'hay patrones que no completan la duración de su compás');assert(RHYTHM_PATTERNS.some(pattern=>pattern.meter==='2/4')&&RHYTHM_PATTERNS.some(pattern=>pattern.meter==='3/4')&&RHYTHM_PATTERNS.some(pattern=>pattern.meter==='6/8'),'faltan compases de 2/4, 3/4 o 6/8');rhythmReadingTimes=rhythmPatternAttacks(rhythmReadingPattern).map(beat=>beat*rhythmUnit);rhythmReadingArmed=true;checkRhythmReading();assert(!rhythmReadingArmed,'ritmo no cerró el ejercicio');assert(state.god.rhythmAssessment.mastered.includes(rhythmReadingPattern.id),'no guardó el patrón rítmico');for(const pattern of RHYTHM_PATTERNS){rhythmReadingPattern=pattern;rhythmReadingTempoOverride=null;const unit=rhythmQuarterDurationMs();rhythmReadingTimes=rhythmPatternAttacks(pattern).map(beat=>beat*unit);rhythmReadingArmed=true;checkRhythmReading();}assert(state.god.rhythmAssessment.mastered.length===RHYTHM_PATTERNS.length,'no se pudieron dominar todos los patrones rítmicos');const attacks=rhythmPatternAttacks(rhythmReadingPattern),feedbackUnit=rhythmQuarterDurationMs();rhythmReadingTimes=attacks.map(beat=>beat*feedbackUnit+250);rhythmReadingArmed=true;checkRhythmReading();assert(document.getElementById('rhythmReadingMsg').textContent.includes('Ataque 1'),'feedback rítmico no identifica el ataque desviado');pass('Lectura rítmica','cancelación de conteo + ataques derivados de steps + dominio + feedback por ataque')}catch(e){fail('Lectura rítmica',e)}
 // Beginner accessibility: repertoire is intentionally open without completing theory first.
 try{state=clone(defaultState);state.theory=state.theory||{completed:{},xp:0};state.theory.completed={};show('repertoire');assert(!document.getElementById('main').textContent.includes('Primero entendamos esto'),'repertorio bloqueó al principiante por teoría');assert(document.getElementById('main').textContent.includes('Amanecer'),'repertorio no ofrece la primera pieza');pass('Acceso inicial al repertorio','principiante puede empezar sin prerequisitos teóricos')}catch(e){fail('Acceso inicial al repertorio',e)}

 // Two hands.
 try{newTwoHands();startTwoHands();for(const ev of twoHandsPhrase.events)for(const n of ev.left.concat(ev.right))registerTwoHandsNote(n);const twoHandsBeat=60000/twoHandsPhrase.tempo;twoHandsTimes=twoHandsPhrase.events.map((_,i)=>i*twoHandsBeat);checkTwoHands();assert(twoHandsAwarded,'dos manos no otorgó dominio');pass('Dos manos','todos los bloques coordinados')}catch(e){fail('Dos manos',e)}
 // Technique.
 try{newTechnique();startTechnique();const beat=60000/techniqueExercise.tempo;techniqueTimes=techniqueExercise.notes.map((_,i)=>i*beat);techniqueStep=techniqueExercise.notes.length;checkTechnique();assert(techniqueAwarded,'técnica no aprobó');pass('Técnica/digitación','secuencia + pulso aceptados')}catch(e){fail('Técnica/digitación',e)}
 // Repertoire.
 try{newRepertoire();repertoireTempoOverride=null;startRepertoire();repertoireInput=repertoirePiece.notes.slice();const unit=60000/getRepertoireTempo();let elapsed=0;repertoireTimes=repertoirePiece.notes.map((_,i)=>{const at=elapsed;elapsed+=(repertoirePiece.dur[i]||1)*unit;return at});checkRepertoire();assert(repertoireAwarded,'repertorio no aprobó');pass('Repertorio','notas + timing aceptados')}catch(e){fail('Repertorio',e)}
 // Repertoire progression: learn by pitch class, read exact octave, then play from memory.
 try{
  assert(repertoireLibrary.length===19,'la biblioteca no contiene las 19 piezas previstas');assert(repertoireLibrary.every(piece=>piece.notes.length===piece.dur.length&&piece.notes.every(note=>Number.isInteger(note)&&note>=36&&note<=96)&&piece.dur.every(duration=>duration>0)&&piece.tempo>=45&&piece.tempo<=140),'hay una pieza con notas, duraciones o tempo inválidos');assert(['Brasil','Bossa nova','Samba','Cumbia','Rock and roll','Pop'].every(tag=>repertoireLibrary.some(piece=>piece.tags.includes(tag))),'faltan estilos originales en el repertorio');const originalPiece=repertoireLibrary.find(x=>x.id==='rp1'),originalNotes=originalPiece.notes.slice(),originalDur=originalPiece.dur.slice();
  originalPiece.notes=[60,62];originalPiece.dur=[1,1];
  state=clone(defaultState);state.repertoireMilestones={};state.repertoireSessions={};state.repertoireProgress={};
  selectLibraryPiece('rp1');startRepertoireLearn();
  assert(repertoireStage===0,'el aprendizaje inicial no permite reconocer la nota por clase');
  registerRepertoireLearnNote(72);assert(repertoireLearnIndex===1,'el aprendizaje inicial no aceptó la misma nota en otra octava');
  repertoireLearnActive=false;repertoireLearnToken++;
  startRepertoireRead();assert(repertoireStage===1,'la lectura no avanzó al segundo nivel');
  registerRepertoireReadNote(72);assert(repertoireReadIndex===0,'la lectura aceptó una octava incorrecta');
  registerRepertoireReadNote(60);assert(repertoireReadIndex===1,'la lectura rechazó la nota exacta');
  repertoireReadActive=false;repertoireReadToken++;
  repertoireTempoOverride=70;startRepertoire();
  assert(repertoireStage===2,'la interpretación no activó el modo memoria');
  assert(document.getElementById('repertoireCurrentNoteName').textContent.includes('Memoria activa'),'la interpretación sigue mostrando el nombre de la nota objetivo');
  assert(!document.querySelector('.repertoireKeys .key.target-note'),'la interpretación sigue iluminando la tecla objetivo');
  repertoireInput=[60,62];repertoireTimes=[0,60000/70];checkRepertoire();
  assert(repertoireAwarded&&state.repertoireMilestones.rp1.play,'la canción no se aprobó con el tempo ajustado');
  const earned={right:state.skills.right,rhythm:state.skills.rhythm};
  selectLibraryPiece('rp1');assert(repertoireInput.length===2,'la biblioteca no refleja la pieza ya completada');
  startRepertoire();assert(repertoireInput.length===0,'una repetición no comenzó desde el principio');
  repertoireInput=[60,62];repertoireTimes=[0,60000/70];checkRepertoire();
  assert(state.skills.right===earned.right&&state.skills.rhythm===earned.rhythm,'repetir una canción volvió a otorgar puntos de competencia');
  stopRepertoirePractice();repertoireTempoOverride=null;
  originalPiece.notes=originalNotes;originalPiece.dur=originalDur;
  pass('Repertorio progresivo','aprendizaje por altura + lectura con octava + memoria sin pistas + tempo ajustable');
 }catch(e){fail('Repertorio progresivo',e);repertoireTempoOverride=null;stopRepertoirePractice()}
 // PRS.
 try{state=clone(defaultState);state.god.sight={score:0,attempts:0,history:[]};startSightTest();prsInput=prsExpected.slice();const beat=60000/prsExcerpt.tempo;prsTimes=prsExpected.map((_,i)=>i*beat);finishSightTest();assert(state.god.sight.attempts===1,'PRS no registró intento');pass('PRS lectura a primera vista','puntaje registrado')}catch(e){fail('PRS lectura a primera vista',e)}
 // Performance.
 try{state=clone(defaultState);midiTelemetry={eventsOn:[],eventsOff:[],notes:0,pedal:0};for(let i=0;i<5;i++){midiTelemetry.eventsOn.push({note:60+i,velocity:80,time:i*500});midiTelemetry.eventsOff.push({note:60+i,duration:350});}midiTelemetry.notes=5;analyzePerformance();assert(state.god.performance.sessions.length===1,'Performance no guardó sesión');pass('Performance Engine','métricas calculadas y guardadas')}catch(e){fail('Performance Engine',e)}
 // Initial diagnostic.
 try{state=clone(defaultState);state.god.diagnostic={running:true,results:ENTRY_TASKS.map((t,i)=>({id:t.id,score:80})),};finishEntryDiagnostic();assert(state.god.diagnostic.score===80,'diagnóstico no calculó promedio');pass('Diagnóstico inicial','8 pruebas consolidan perfil')}catch(e){fail('Diagnóstico inicial',e)}
 // Ear basic.
 try{state=clone(defaultState);show('ear');earRound=[60,62,64];earInput=['C','D','E'];checkEar();assert(window._earSolved===true,'oído no marcó solución');completeEarAndContinue();assert(state.lessons.l5,'oído no completó');pass('Oído básico','respuesta y continuación funcionan')}catch(e){fail('Oído básico',e)}
 // Accompaniment chord feedback.
 try{state=clone(defaultState);showHTML(accompaniment());accChordFeedback('C');assert(document.getElementById('accDetected').textContent.includes('C'),'acompañamiento no actualizó feedback');pass('Acompañamiento','feedback de acorde funciona')}catch(e){fail('Acompañamiento',e)}
 // Deep structural diagnostics.
 try{state=clone(defaultState);state.day=1;saveState();showHTML(settings());const d=runDeepDiag();const bad=d.filter(x=>!x.o&&x.d!=='opcional según navegador');assert(!bad.length,'fallos: '+bad.map(x=>x.n||JSON.stringify(x)).join(', '));pass('Autodiagnóstico profundo','sin fallos estructurales')}catch(e){fail('Autodiagnóstico profundo',e)}

 // Imported MIDI regression: an incorrect note is recorded and the phrase advances instead of waiting forever.
 try{
  state=clone(defaultState);state.god.library=[{id:'midi-regression',source:'midi',data:{sequence:[{midi:60,startMs:0,track:0},{midi:62,startMs:500,track:0}]}}];
  importedSongPractice={songId:'midi-regression',index:0,correct:0,errors:0,history:[],active:true,tempoScale:.75,message:'',playToken:0,playing:false,paused:false,offsetMs:0,currentNotes:[],mode:'wait',waiting:true,waitGroup:[{midi:60,startMs:0,track:0}],waitGroupStart:0,waitGroupEnd:1,phraseStart:0,phraseEnd:2,waitRemaining:new Set([0]),trackFilter:null,handFilter:'both'};
  registerImportedSongPractice(61);
  assert(importedSongPractice.errors===1,'no registró el error de la nota MIDI');
  assert(importedSongPractice.history.length===1&&importedSongPractice.history[0].correct===false,'no conservó el detalle de la nota equivocada');
  assert(importedSongPractice.index===1,'la canción MIDI no avanzó después del error');
  assert(importedSongPractice.waitGroup[0]?.midi===62,'no mostró la siguiente nota después del error');
  assert(importedSongPractice.waiting===true,'la práctica no continuó esperando la siguiente posición');
  pass('Canciones MIDI · avance tras error','registra la nota equivocada, conserva el historial y continúa con la siguiente posición');
 }catch(e){fail('Canciones MIDI · avance tras error',e)}

 // Persistence regression: simulate closing/reopening the app using the same browser storage.
 try{
  localStorage.clear();
  state=normalizeState(clone(defaultState));
  state.day=4;state.lessons={l1:true,l2:true,l3:true};
  state.repertoireProgress={rp1:50,rp2:25};
  state.repertoireMilestones={rp1:{learn:true,read:true}};
  state.repertoireSessions={rp1:{mode:'learn',index:4,updatedAt:new Date().toISOString()},rp2:{mode:'play',index:2,notes:[60,62],updatedAt:new Date().toISOString()},rp3:{mode:'read',index:3,updatedAt:new Date().toISOString()}};
  saveState();
  const savedRaw=localStorage.getItem(KEY);
  assert(!!savedRaw,'saveState no escribió la clave principal');
  state=normalizeState(clone(defaultState)); // representa una nueva carga de la aplicación
  state=loadState();
  assert(state.lessons.l1===true&&state.lessons.l3===true,'no restauró las lecciones completadas');
  assert(state.repertoireProgress.rp1===50&&state.repertoireProgress.rp2===25,'no restauró el porcentaje del repertorio');
  assert(state.repertoireMilestones.rp1.learn===true&&state.repertoireMilestones.rp1.read===true,'no restauró los hitos de canción');
  assert(state.repertoireSessions.rp1.mode==='learn'&&state.repertoireSessions.rp1.index===4,'no restauró la sesión de aprendizaje');assert(state.repertoireSessions.rp2.mode==='play'&&state.repertoireSessions.rp2.index===2&&state.repertoireSessions.rp2.notes.join(',')==='60,62','no restauró las notas de interpretación ya tocadas');assert(state.repertoireSessions.rp3.mode==='read'&&state.repertoireSessions.rp3.index===3,'no restauró la sesión de lectura');
  pass('Persistencia tras recarga','lecciones, porcentaje, hitos y sesión del repertorio sobreviven al reinicio');
 }catch(e){fail('Persistencia tras recarga',e)}


 // Course teaching guide: six levels must expose an explanation, method, common error and approval criterion.
 try{
  const previousTestMode=window._testMode,previousLanguage=pianoLanguage;window._testMode=false;pianoLanguage='es';
  const samples=[1,16,31,46,61,76].map(day=>LESSONS.find(x=>x.day===day));
  samples.forEach(l=>{insertCourseTeachingGuide(l);const guide=document.querySelector('.courseTeachingGuide');assert(guide,'no se insertó la guía para '+l.id);assert(guide.textContent.includes('Qué tenés que comprender')&&guide.textContent.includes('Cómo resolver este ejercicio')&&guide.textContent.includes('Error frecuente')&&guide.textContent.includes('Criterio de aprobación'),'guía incompleta en '+l.id);guide.remove()});
  window._testMode=previousTestMode;pianoLanguage=previousLanguage;pass('Guía pedagógica en seis niveles','cada nivel explica concepto, estrategia, error frecuente y criterio de aprobación');
 }catch(e){window._testMode=true;fail('Guía pedagógica en seis niveles',e)}

 // Portuguese teaching-guide audit: the six levels must expose fully localized explanations and criteria.
 try{
  const previousTestMode=window._testMode,previousLanguage=pianoLanguage;
  try{
   window._testMode=false;pianoLanguage='pt';
   const samples=[1,16,31,46,61,76].map(day=>LESSONS.find(x=>x.day===day));
   const spanishGuideImperatives=/(?:Localizá|Nombrá|Tocá|Escuchá|Mantené|Reconocé|Contá|Decí|Encontrá|Construí|Prepará|Uní|Combiná|Identificá|Leé|Explicá|Volvé|Bajá|Subí|Regresá)/i;
   samples.forEach(l=>{const main=document.getElementById('main');main.innerHTML='<h1>Teste</h1>';insertCourseTeachingGuide(l);const guide=main.querySelector('.courseTeachingGuide');assert(guide,'não inseriu o guia para '+l.id);assert(guide.textContent.includes('O que você precisa compreender')&&guide.textContent.includes('Como resolver este exercício')&&guide.textContent.includes('Erro frequente')&&guide.textContent.includes('Critério de aprovação'),'guia em português incompleto no '+l.id);const spanishMatch=guide.textContent.match(spanishGuideImperatives);assert(!spanishMatch,'guia em português conserva '+(spanishMatch?.[0]||'texto')+' no '+l.id+': '+guide.textContent);guide.remove()});
  }finally{window._testMode=previousTestMode;pianoLanguage=previousLanguage}
  pass('Guias pedagógicas em português','seis níveis com explicação, método, erro frequente e critério localizados');
 }catch(e){fail('Guias pedagógicas em português',e)}
 // Motor 11: only valid, unique, bounded evidence can raise a competence.
 try{
  state=clone(defaultState);state.skills=Object.fromEntries(MOTOR11_SKILLS.map(k=>[k,0]));
  assert(awardUniqueSkillEvidence('motor-test','ear-phrase-1',{ear:2,autonomy:25,unknown:8})===true,'no registró evidencia válida');
  assert(state.skills.ear===2&&state.skills.autonomy===10,'no validó ni limitó los puntos');
  assert(awardUniqueSkillEvidence('motor-test','ear-phrase-1',{ear:5})===false,'la misma evidencia sumó dos veces');
  assert(awardUniqueSkillEvidence('motor-test','invalid',{unknown:5})===false,'aceptó una competencia inexistente');
  assert(state.god.skillEvidenceLog.length===1,'el registro de evidencias no coincide');
  pass('Motor 11 · evidencia única y acotada','sin duplicados, competencias desconocidas ni incrementos excesivos');
 }catch(e){fail('Motor 11 · evidencia única y acotada',e)}
 // Motor 11: verify all eight skill channels using their actual evidence categories.
 try{
  state=clone(defaultState);state.skills=Object.fromEntries(MOTOR11_SKILLS.map(skill=>[skill,0]));
  const evidenceBySkill={orientation:'reading',rhythm:'rhythmReading',right:'phrases',left:'courseTwoHands',chords:'accompaniment',ear:'courseAuto',memory:'courseAuto',autonomy:'courseAuto'};
  for(const skill of MOTOR11_SKILLS){
   const category=evidenceBySkill[skill];
   assert(typeof category==='string','falta fuente de evidencia para '+skill);
   assert(awardUniqueSkillEvidence(category,'motor11-'+skill,{[skill]:4})===true,'no se acreditó '+skill);
   assert(state.skills[skill]===4,'puntaje incorrecto para '+skill);
  }
  assert(state.god.skillEvidenceLog.length===MOTOR11_SKILLS.length,'faltan evidencias en el registro');
  assert(autonomyScore()===4&&autonomyFloorScore()===4,'promedio o competencia más débil mal calculados');
  state.skills=Object.fromEntries(MOTOR11_SKILLS.map(skill=>[skill,60]));state.skills.left=34;
  assert(autonomyFloorScore()===34&&autonomyMode()==='guide','una competencia débil no mantuvo la guía completa');
  state.skills.left=35;assert(autonomyMode()==='reduced','no redujo la ayuda al alcanzar 35%');
  state.skills.left=55;assert(autonomyMode()==='memory','no activó memoria al alcanzar 55%');
  state.skills=Object.fromEntries(MOTOR11_SKILLS.map(skill=>[skill,75]));assert(autonomyFloorScore()===75&&autonomyMode()==='autonomous','no activó autonomía cuando las ocho competencias alcanzaron 75%');
  pass('Motor 11 · cobertura de ocho competencias','cada competencia tiene evidencia en el curso; la más débil gobierna la retirada de ayudas');
 }catch(e){fail('Motor 11 · cobertura de ocho competencias',e)}

 // Repertoire resume: all three stages recover their own index and the played notes.
 try{
  state=normalizeState(clone(defaultState));state.repertoireMilestones={};state.repertoireSessions={
   rp1:{mode:'learn',index:1,updatedAt:new Date().toISOString()},
   rp2:{mode:'read',index:2,updatedAt:new Date().toISOString()},
   rp3:{mode:'play',index:2,notes:[64,64],updatedAt:new Date().toISOString()}
  };saveState();
  selectLibraryPiece('rp1');assert(repertoireLearnActive&&repertoireLearnIndex===1,'no retomó aprendizaje en su índice');
  selectLibraryPiece('rp2');assert(repertoireReadActive&&repertoireReadIndex===2,'no retomó lectura en su índice');
  selectLibraryPiece('rp3');assert(repertoireInput.length===2&&repertoireInput[0]===64&&repertoireInput[1]===64,'no restauró las notas tocadas');
  startRepertoire();assert(repertoireInput.length===2,'Continuar interpretación descartó las notas recuperadas');
  stopRepertoirePractice();
  state.repertoireMilestones={};repertoirePiece=repertoireLibrary.find(x=>x.id==='rp1');
  markRepertoireMilestone('learn');assert(state.repertoireProgress.rp1===25,'aprendizaje no computó 25%');
  markRepertoireMilestone('read');assert(state.repertoireProgress.rp1===50,'lectura no computó 50%');
  markRepertoireMilestone('play');assert(state.repertoireProgress.rp1===100,'interpretación no completó 100%');
  pass('Repertorio · recuperación de las tres etapas','aprendizaje, lectura e interpretación retoman índice/notas y guardan 25/50/100%');
 }catch(e){fail('Repertorio · recuperación de las tres etapas',e);stopRepertoirePractice()}

 // Point 3: band practice records errors, advances, completes two passes and stops the backing.
 try{
  state=clone(defaultState);state.repertoireAttempts={};state.repertoireSessions={};state.repertoireMilestones={};
  repertoirePiece={id:'band-test',title:'Prueba de banda',notes:[60,62],dur:[1,1],tempo:72};
  repertoireStage=0;repertoireInput=[];repertoireTimes=[];repertoirePlayedHistory=[];bandPracticeResults=[];bandPracticeActive=true;repertoireStarted=true;bandPracticeTimer=null;
  registerRepertoireNote(61);
  assert(bandPracticeResults.length===1&&!bandPracticeResults[0].correct&&bandPracticeResults[0].expected===60,'un error bloqueó o no registró la primera posición');
  registerRepertoireNote(62);registerRepertoireNote(60);registerRepertoireNote(62);
  assert(!bandPracticeActive&&!repertoireStarted,'la banda no se detuvo al completar dos pasadas');
  const attempt=state.repertoireAttempts['band-test']?.[0];
  assert(attempt&&attempt.results.length===4&&attempt.correct===3&&attempt.total===4,'no guardó los cuatro ataques y el porcentaje de dos pasadas');
  assert(attempt.results[0].correct===false&&attempt.results[0].expected===60&&attempt.results[1].correct===true,'el historial no distingue nota incorrecta y correcta');
  pass('Práctica con banda · dos pasadas','registra errores sin bloquear, avanza a la nota siguiente, guarda el detalle y detiene el audio al completar dos vueltas');
 }catch(e){fail('Práctica con banda · dos pasadas',e);bandPracticeActive=false;repertoireStarted=false;stopBackingTrack()}

 // Point 3: the accompaniment control must start, stop and stop automatically when leaving its screen.
 try{
  const savedAccomp={...accomp},savedTick=accTick;
  let ticks=0;
  accTick=()=>{ticks++};
  accomp={...savedAccomp,running:false,timer:null,beat:0,step:0};
  toggleAccompaniment();
  assert(accomp.running&&ticks===1,'el botón no inició la base musical');
  toggleAccompaniment();
  assert(!accomp.running&&accomp.timer===null,'el botón no detuvo la base musical');
  accomp.running=true;accomp.timer=setTimeout(()=>{},60000);
  show('home');
  assert(!accomp.running&&accomp.timer===null,'el audio siguió activo al salir de Acompañamiento');
  state.theory=state.theory||{completed:{},practice:{},xp:0};state.theory.completed=state.theory.completed||{};['T29','T30','T31','T32','T33','T34'].forEach(id=>state.theory.completed[id]=true);
  setAccStyle('Rock');assert(accomp.style==='Rock'&&accomp.bpm===112,'el estilo Rock no aplicó su tempo');
  setAccProgression(3);assert(accomp.progression.join('-')==='Am-Dm-G-C','la progresión seleccionada no se aplicó');
  show('accompaniment');assert((document.getElementById('main')?.innerText||'').includes('Am–Dm–G–C'),'la cuarta progresión no aparece disponible en la interfaz');
  accomp=savedAccomp;accTick=savedTick;
  pass('Acompañamiento · control de reproducción','inicia, detiene, cambia estilos/progresiones y corta el audio al navegar fuera');
 }catch(e){fail('Acompañamiento · control de reproducción',e);if(accomp.timer)clearTimeout(accomp.timer);accomp.running=false;accomp.timer=null}
 
 // Point 3: every original repertoire piece must be playable, duration-aligned and fit the 61-key range.
 try{
  assert(repertoireLibrary.length>=19,'faltan piezas originales en la biblioteca');
  const invalid=repertoireLibrary.filter(piece=>!piece.id||!piece.title||!Number.isFinite(piece.tempo)||piece.tempo<40||piece.tempo>180||!Array.isArray(piece.notes)||piece.notes.length<24||!Array.isArray(piece.dur)||piece.dur.length!==piece.notes.length||piece.dur.some(d=>!Number.isFinite(d)||d<=0)||piece.notes.some(n=>!Number.isInteger(n)||n<36||n>96));
  assert(invalid.length===0,'hay piezas no reproducibles o con notas/duraciones inválidas: '+invalid.map(x=>x.id).join(','));
  const originals=repertoireLibrary.filter(piece=>(piece.tags||[]).includes('Original'));
  assert(originals.length>=10,'la biblioteca perdió el repertorio original de estilos brasileños, pop y rock');
  pass('Repertorio original · biblioteca validada',repertoireLibrary.length+' piezas con notas y duraciones alineadas, tempo válido y extensión compatible con el teclado de 61 teclas');
 }catch(e){fail('Repertorio original · biblioteca validada',e)}

 // Point 3: when an external MIDI output is selected, app playback must sound through the piano.
 try{
  const previousOutput=midiOutput,sent=[];
  midiOutput={send:(message,when)=>sent.push({message:Array.from(message),when})};
  const midiTestStartedAt=performance.now();tone(60,.25);
  assert(sent.length===2,'la reproducción no envió note-on y note-off al piano MIDI');
  assert(sent[0].message.join(',')==='144,60,90','el piano no recibió Do central con note-on');
  assert(sent[1].message.join(',')==='128,60,0','el piano no recibió note-off para liberar la tecla');
  assert(Number.isFinite(sent[1].when)&&sent[1].when>=midiTestStartedAt+200,'el note-off no quedó programado después del ataque');
  midiOutput=previousOutput;
  pass('MIDI · salida al piano físico','la reproducción envía note-on/note-off al dispositivo elegido en vez de sonar solo en la notebook');
 }catch(e){fail('MIDI · salida al piano físico',e);midiOutput=null}


 // Point 3: scheduled note sequences must be cancellable, silent after stop and cancelled on navigation.
 try{
  const previousOutput=midiOutput,sent=[];
  midiOutput={send:(message,when)=>sent.push({message:Array.from(message),when})};
  playSeq([60,62,64],100,.1);
  assert(sequencePlaybackActive&&sequencePlaybackTimers.size>=3,'la secuencia no registró sus temporizadores');
  assert(document.getElementById('sequenceStopControl')?.style.display==='block','no apareció el control visible para detener audio');
  stopSequencePlayback();
  assert(!sequencePlaybackActive&&sequencePlaybackTimers.size===0,'Detener no canceló todos los temporizadores');
  assert(document.getElementById('sequenceStopControl')?.style.display==='none','el control de detener no se ocultó al parar');
  await new Promise(resolve=>setTimeout(resolve,260));
  assert(!sent.some(item=>item.message[0]===0x90),'se envió una nota después de detener la secuencia');
  playSeq([60,62,64],100,.1);
  show('home');
  assert(!sequencePlaybackActive&&sequencePlaybackTimers.size===0,'la navegación no detuvo la secuencia');
  midiOutput=previousOutput;
  pass('Reproducción · detener y navegar','cancela notas pendientes, no dispara ataques posteriores y se detiene al cambiar de pantalla');
 }catch(e){fail('Reproducción · detener y navegar',e);stopSequencePlayback()}


 // Point 3: the complete 61-key teaching keyboard must remain fixed and fit without horizontal overflow.
 try{
  showHTML(keyboardMap());
  const piano=document.querySelector('#main .keys.responsive-piano-keys');
  assert(piano,'no se renderizó el teclado didáctico');
  assert(piano.querySelectorAll('.key').length===61,'el teclado no contiene exactamente 61 teclas');
  assert(getComputedStyle(piano).position==='fixed','las reglas CSS volvieron a convertir el teclado fijo en elemento de página');
  assert(piano.scrollWidth<=piano.clientWidth+1,'las 61 teclas exceden el ancho visible');
  assert(parseFloat(getComputedStyle(document.getElementById('main')).paddingBottom)>=140,'el contenido no reservó espacio para que el teclado no lo tape');
  pass('Teclado · 61 teclas sin desbordamiento','61 teclas visibles, posición fija, sin scroll horizontal y con espacio inferior reservado');
 }catch(e){fail('Teclado · 61 teclas sin desbordamiento',e)}

 const failed=results.filter(x=>!x.ok); document.body.innerHTML='<h1>Autonomía Piano — TEST EXHAUSTIVO v40.0</h1><pre id="results">'+results.map(x=>(x.ok?'PASS ':'FAIL ')+x.name+(x.detail?' :: '+x.detail:'')).join('\n')+'\n\nTOTAL: '+results.length+' | PASS: '+(results.length-failed.length)+' | FAIL: '+failed.length+'</pre>';
 window.__TEST_RESULTS=results;
})();
