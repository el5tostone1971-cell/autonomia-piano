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
      case 'l4': playSeqTest(['C','D','E','D','C'].map(x=>midi(x))); checkMemory(); break;
      case 'l5': earRound=[60,62,64]; earInput=['C','D','E']; checkEar(); completeEarAndContinue(); break;
      case 'l6': [['C',[60,64,67]],['G',[55,59,62]],['Am',[57,60,64]],['F',[53,57,60]]].forEach(([_,ns])=>playSeqTest(ns)); checkChords('l6'); break;
      case 'l7': playSeqTest(['C','G','A','F'].map(x=>midi(x,3))); checkPattern('l7',['C','G','A','F'],'left'); break;
      case 'l8': playSeqTest(['C','D','E','G'].map(x=>midi(x,4))); playSeqTest(['C','G','A','F'].map(x=>midi(x,3))); checkSeparate('l8'); break;
      case 'l9': playSeqTest(['C','D','E','G','E','D','C'].map(x=>midi(x))); checkPattern('l9',patternExpected,'memory2'); break;
      case 'l10': playSeqTest(['C','D','E','G','E','D','C'].map(x=>midi(x))); rhythmTimes=[0,600,1200,1800,2400,3000,3600]; checkRhythm2('l10'); break;
      case 'l11': chordSequence=['C','G','Am','F']; chordHits=new Set(['C','G','Am','F']); checkChords('l11'); break;
      case 'l12': autoInput=['C','D','E','G','E','D','C']; checkPattern('l12',patternExpected,'autonomy'); break;
      default:
        if(l.kind==='chordgeneric'){chordSequence=l.targetChords.slice(); checkGenericChords(l.id);}
        else {pattern=l.seq.slice(); checkGeneric(l.id);}
    }
    clearTimeout(window._nextTimer); await new Promise(r=>setTimeout(r,5));
    assert(!!state.lessons[l.id],`no quedó completada: ${l.id}`);
  };
  for(const l of LESSONS) await completeCourseLesson(l);
  assert(state.day===90,'Día final esperado 90, obtenido '+state.day);
  pass('90/90 ejercicios del curso','progresión completa sin bloqueos');
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

 // Reading.
 try{show('reading'); readingExpectedSeq=[60];readingStage='play';readingPlayedSeq=[60];checkReading();pass('Lectura musical','respuesta correcta aceptada')}catch(e){fail('Lectura musical',e)}
 // Rhythm reading.
 try{show('rhythmReading');newRhythmReading();rhythmReadingArmed=true;rhythmReadingTimes=rhythmReadingPattern.beats.reduce((a,b,i)=>{a.push((i? a[i-1]:0)+(i?b*600:0));return a},[]);checkRhythmReading();assert(!rhythmReadingArmed,'ritmo no cerró el ejercicio');pass('Lectura rítmica','pulso correcto aceptado')}catch(e){fail('Lectura rítmica',e)}
 // Two hands.
 try{newTwoHands();startTwoHands();for(const ev of twoHandsPhrase.events)for(const n of ev.left.concat(ev.right))registerTwoHandsNote(n);checkTwoHands();assert(twoHandsAwarded,'dos manos no otorgó dominio');pass('Dos manos','todos los bloques coordinados')}catch(e){fail('Dos manos',e)}
 // Technique.
 try{newTechnique();startTechnique();const beat=60000/techniqueExercise.tempo;techniqueTimes=techniqueExercise.notes.map((_,i)=>i*beat);techniqueStep=techniqueExercise.notes.length;checkTechnique();assert(techniqueAwarded,'técnica no aprobó');pass('Técnica/digitación','secuencia + pulso aceptados')}catch(e){fail('Técnica/digitación',e)}
 // Repertoire.
 try{newRepertoire();startRepertoire();repertoireInput=repertoirePiece.notes.slice();const unit=60000/repertoirePiece.tempo;repertoireTimes=repertoirePiece.notes.map((_,i)=>i===0?0:repertoireTimes[0]+repertoirePiece.dur.slice(0,i).reduce((a,b)=>a+b*unit,0));checkRepertoire();assert(repertoireAwarded,'repertorio no aprobó');pass('Repertorio','notas + timing aceptados')}catch(e){fail('Repertorio',e)}
 // PRS.
 try{state=clone(defaultState);state.god.sight={score:0,attempts:0,history:[]};startSightTest();prsInput=prsExpected.slice();const beat=60000/prsExcerpt.tempo;prsTimes=prsExpected.map((_,i)=>i*beat);finishSightTest();assert(state.god.sight.attempts===1,'PRS no registró intento');pass('PRS lectura a primera vista','puntaje registrado')}catch(e){fail('PRS lectura a primera vista',e)}
 // Performance.
 try{state=clone(defaultState);midiTelemetry={eventsOn:[],eventsOff:[],notes:0,pedal:0};for(let i=0;i<5;i++){midiTelemetry.eventsOn.push({note:60+i,velocity:80,time:i*500});midiTelemetry.eventsOff.push({note:60+i,duration:350});}midiTelemetry.notes=5;analyzePerformance();assert(state.god.performance.sessions.length===1,'Performance no guardó sesión');pass('Performance Engine','métricas calculadas y guardadas')}catch(e){fail('Performance Engine',e)}
 // Initial diagnostic.
 try{state=clone(defaultState);state.god.diagnostic={running:true,results:ENTRY_TASKS.map((t,i)=>({id:t.id,score:80})),};finishEntryDiagnostic();assert(state.god.diagnostic.score===80,'diagnóstico no calculó promedio');pass('Diagnóstico inicial','8 pruebas consolidan perfil')}catch(e){fail('Diagnóstico inicial',e)}
 // Ear basic.
 try{state=clone(defaultState);show('ear');earRound=[60,62,64];earInput=['C','D','E'];checkEar();assert(window._earSolved===true,'oído no marcó solución');completeEarAndContinue();assert(state.lessons.l5,'oído no completó');pass('Oído básico','respuesta y continuación funcionan')}catch(e){fail('Oído básico',e)}
 // Accompaniment chord feedback.
 try{state=clone(defaultState);show('accompaniment');accChordFeedback('C');assert(document.getElementById('accDetected').textContent.includes('C'),'acompañamiento no actualizó feedback');pass('Acompañamiento','feedback de acorde funciona')}catch(e){fail('Acompañamiento',e)}
 // Deep structural diagnostics.
 try{show('settings');const d=runDeepDiag();const bad=d.filter(x=>!x.ok&&x.detail!=='opcional según navegador');assert(!bad.length,'fallos: '+bad.map(x=>x.name).join(', '));pass('Autodiagnóstico profundo','sin fallos estructurales')}catch(e){fail('Autodiagnóstico profundo',e)}

 const failed=results.filter(x=>!x.ok); document.body.innerHTML='<h1>Autonomía Piano — TEST EXHAUSTIVO v40.0</h1><pre id="results">'+results.map(x=>(x.ok?'PASS ':'FAIL ')+x.name+(x.detail?' :: '+x.detail:'')).join('\n')+'\n\nTOTAL: '+results.length+' | PASS: '+(results.length-failed.length)+' | FAIL: '+failed.length+'</pre>';
 window.__TEST_RESULTS=results;
})();
