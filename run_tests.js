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
      case 'l7': playSeqTest(['C','G','A','F'].map(x=>midi(x,3))); checkPattern('l7',['C','G','A','F'],'left'); break;
      case 'l8': playSeqTest(['C','D','E','G'].map(x=>midi(x,4))); playSeqTest(['C','G','A','F'].map(x=>midi(x,3))); checkSeparate('l8'); break;
      case 'l9': pattern=patternExpected.slice();checkPattern('l9',patternExpected,'memory2');break;
      case 'l10': playSeqTest(['C','D','E','G','E','D','C'].map(x=>midi(x))); rhythmTimes=[0,600,1200,1800,2400,3000,3600]; checkRhythm2('l10'); break;
      case 'l11': chordSequence=['C','G','Am','F']; chordHits=new Set(['C','G','Am','F']); checkChords('l11'); break;
      case 'l12': autoChallengeReady=true;autoInput=patternExpected.slice();checkPattern('l12',patternExpected,'autonomy');clearTimeout(autoChallengeTimer);break;
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

 // Public spaced repetition regression test.
 try{
  state=clone(defaultState); state.day=3; state.lessons={l1:true,l2:true,l3:true}; state.god.spaced.queue=[]; saveState();
  show('spaced'); seedSpaced();
  assert(document.querySelector('#main').textContent.includes('programadas'),'la vista de repaso no renderizó');
  const first=state.god.spaced.queue[0]; assert(first && first.dueAt,'no se creó una revisión');
  first.dueAt=new Date(Date.now()-86400000).toISOString(); show('spaced');
  assert(document.querySelector('#main').textContent.includes('Vencida'),'no aparece una revisión vencida');
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
 try{showHTML(rhythmReadingView());newRhythmReading();renderRhythmReading();rhythmReadingCountdownTimer=setTimeout(()=>{},10000);rhythmReadingArmed=true;newRhythmReading();assert(rhythmReadingCountdownTimer===null&&!rhythmReadingArmed,'Nueva lectura no canceló el conteo pendiente');const rhythmUnit=60000/getRhythmReadingTempo();const rhythmTotals=RHYTHM_PATTERNS.map(pattern=>({id:pattern.id,total:pattern.steps.reduce((sum,step)=>sum+step[1],0),expected:Number(pattern.meter.split('/')[0])*4/Number(pattern.meter.split('/')[1])}));assert(rhythmTotals.every(item=>Math.abs(item.total-item.expected)<0.001),'hay patrones que no completan la duración de su compás');assert(RHYTHM_PATTERNS.some(pattern=>pattern.meter==='2/4')&&RHYTHM_PATTERNS.some(pattern=>pattern.meter==='3/4')&&RHYTHM_PATTERNS.some(pattern=>pattern.meter==='6/8'),'faltan compases de 2/4, 3/4 o 6/8');rhythmReadingTimes=rhythmPatternAttacks(rhythmReadingPattern).map(beat=>beat*rhythmUnit);rhythmReadingArmed=true;checkRhythmReading();assert(!rhythmReadingArmed,'ritmo no cerró el ejercicio');assert(state.god.rhythmAssessment.mastered.includes(rhythmReadingPattern.id),'no guardó el patrón rítmico');const attacks=rhythmPatternAttacks(rhythmReadingPattern);rhythmReadingTimes=attacks.map(beat=>beat*rhythmUnit+250);rhythmReadingArmed=true;checkRhythmReading();assert(document.getElementById('rhythmReadingMsg').textContent.includes('Ataque 1'),'feedback rítmico no identifica el ataque desviado');pass('Lectura rítmica','cancelación de conteo + ataques derivados de steps + dominio + feedback por ataque')}catch(e){fail('Lectura rítmica',e)}
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
  const originalPiece=repertoireLibrary.find(x=>x.id==='rp1'),originalNotes=originalPiece.notes.slice(),originalDur=originalPiece.dur.slice();
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

 // Persistence regression: simulate closing/reopening the app using the same browser storage.
 try{
  localStorage.clear();
  state=normalizeState(clone(defaultState));
  state.day=4;state.lessons={l1:true,l2:true,l3:true};
  state.repertoireProgress={rp1:50,rp2:25};
  state.repertoireMilestones={rp1:{learn:true,read:true}};
  state.repertoireSessions={rp1:{mode:'learn',index:4,updatedAt:new Date().toISOString()},rp2:{mode:'play',index:2,notes:[60,62],updatedAt:new Date().toISOString()}};
  saveState();
  const savedRaw=localStorage.getItem(KEY);
  assert(!!savedRaw,'saveState no escribió la clave principal');
  state=normalizeState(clone(defaultState)); // representa una nueva carga de la aplicación
  state=loadState();
  assert(state.lessons.l1===true&&state.lessons.l3===true,'no restauró las lecciones completadas');
  assert(state.repertoireProgress.rp1===50&&state.repertoireProgress.rp2===25,'no restauró el porcentaje del repertorio');
  assert(state.repertoireMilestones.rp1.learn===true&&state.repertoireMilestones.rp1.read===true,'no restauró los hitos de canción');
  assert(state.repertoireSessions.rp1.mode==='learn'&&state.repertoireSessions.rp1.index===4,'no restauró la sesión de aprendizaje');assert(state.repertoireSessions.rp2.mode==='play'&&state.repertoireSessions.rp2.index===2&&state.repertoireSessions.rp2.notes.join(',')==='60,62','no restauró las notas de interpretación ya tocadas');
  pass('Persistencia tras recarga','lecciones, porcentaje, hitos y sesión del repertorio sobreviven al reinicio');
 }catch(e){fail('Persistencia tras recarga',e)}

 const failed=results.filter(x=>!x.ok); document.body.innerHTML='<h1>Autonomía Piano — TEST EXHAUSTIVO v40.0</h1><pre id="results">'+results.map(x=>(x.ok?'PASS ':'FAIL ')+x.name+(x.detail?' :: '+x.detail:'')).join('\n')+'\n\nTOTAL: '+results.length+' | PASS: '+(results.length-failed.length)+' | FAIL: '+failed.length+'</pre>';
 window.__TEST_RESULTS=results;
})();
