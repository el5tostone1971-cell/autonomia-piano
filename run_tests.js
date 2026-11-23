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
        if(l.kind==='pulseCourse'){
          pulseCourseStartedAt=performance.now();pulseCourseTimes=Array.from({length:8},(_,i)=>pulseCourseStartedAt+i*600);pulseCourseArmed=true;checkPulseCourse();
        }else if(l.kind==='echoCourse'){
          echoCourseInput=echoCourseExpected.slice();checkEchoCourse();
        }else if(l.kind==='staffcourse'){
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
          courseTwoHandsEvents.forEach(event=>event.left.concat(Array.isArray(event.right)?event.right:[event.right]).forEach(note=>registerCourseTwoHandsNote(note)));
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

 // Block A · Nivel 1 fundamentos: comprobar orden y foco real de cada motor.
 try{
  const level1=LESSONS.filter(l=>l.day>=1&&l.day<=15);
  assert(level1.length===15,'Nivel 1 no contiene 15 lecciones');
  assert(level1.every((l,i)=>l.day===i+1&&l.id==='l'+(i+1)),'Orden o IDs del Nivel 1 inconsistentes');
  assert(level1.every(l=>exerciseFunctionName(l.kind)&&typeof window[exerciseFunctionName(l.kind)]==='function'),'Nivel 1 incluye motor ausente');
  assert(level1.every(l=>l.title&&l.desc&&l.desc.length>=20),'Nivel 1 tiene consignas incompletas');
  assert(level1.slice(12).every(l=>['orientationCourse','pulseCourse','echoCourse'].includes(l.kind)),'La integración final del Nivel 1 no contiene orientación, pulso y oído');
  const level1ExpectedKinds=['find','pattern','rhythm','memory','ear','chords','left','separate','memory2','rhythm2','chordseq','autonomy','orientationCourse','pulseCourse','echoCourse'];
  assert(level1.every((l,i)=>l.kind===level1ExpectedKinds[i]),'La secuencia de motores del Nivel 1 no coincide con el recorrido diseñado');
  const level1TeachingChecks=['cuatro Do','cinco dedos','cuatro pulsos','de memoria','contorno','tríada de Do mayor','registro grave','frase de la derecha','motivos','ataques regulares','nota común','memoria inmediata'];
  assert(level1.slice(0,12).every((l,i)=>l.desc.toLowerCase().includes(level1TeachingChecks[i].toLowerCase())),'La descripción pedagógica del Nivel 1 perdió su objetivo explícito');

  const savedLanguage=pianoLanguage;pianoLanguage='pt';const ptLevel1=level1.slice(0,12).map(l=>pianoTranslateText(l.desc));pianoLanguage=savedLanguage;
  assert(ptLevel1[0].includes('Oriente-se no teclado')&&ptLevel1[5].includes('tríade de Dó maior')&&ptLevel1[11].includes('memória imediata'),'Las consignas nuevas del Nivel 1 no tienen traducción portuguesa completa');
  assert(level1[5].desc.includes('tríada')||level1[5].desc.includes('acorde'),'La introducción al acorde no explica su contenido');
  assert(level1[9].desc.includes('siete notas')||level1[9].desc.includes('7 notas'),'La lección de melodía rítmica no explicita la frase');

  pass('Nivel 1 · estructura y motores','15 lecciones ordenadas, motores existentes y tres ejercicios integradores finales');
 }catch(e){fail('Nivel 1 · estructura y motores',e)}

 // Block A/B · Level 2 sight-reading must progress through distinct, usable reading skills.
 try{
  assert(Array.isArray(readingPlan)&&readingPlan.length===15,'Nivel 2 debe tener quince etapas de lectura');
  assert(new Set(readingPlan.map(p=>p[0])).size===15,'Nivel 2 repite títulos de lectura');
  assert(readingPlan.every(p=>p[0]&&p[1]&&p[1].length>=75),'Hay etapas de lectura sin consigna aplicable');
  const level2=LESSONS.filter(l=>l.day>=16&&l.day<=30);
  assert(level2.length===15&&level2.every((l,i)=>l.staffTheoryIndex===i&&l.title.includes(readingPlan[i][0])&&l.desc.includes(readingPlan[i][1])),'Las lecciones no siguen el orden progresivo de lectura');
  const staffTopics=['El pentagrama','Clave de Sol','Notas en las líneas','Notas en los espacios','Dirección y altura','Líneas adicionales','Do central y teclado','Octavas','Figuras y duración','Corcheas','Silencios','Compás y 4/4','Barra de compás','Sostenidos y bemoles en la lectura','Armadura y alteración accidental'];
  assert(STAFF_THEORY.length===15&&STAFF_THEORY.every((t,i)=>t.topic===staffTopics[i]),'La explicación teórica no coincide con el foco práctico del día');
  pass('Nivel 2 · lectura progresiva','15 etapas únicas, vinculadas a su explicación y ejercicio de pentagrama');
 }catch(e){fail('Nivel 2 · lectura progresiva',e)}

 // Block A/B · Level 3 must provide fifteen distinct, applied theory focuses.
 try{
  assert(Array.isArray(FOCI)&&FOCI.length===15,'Nivel 3 debe tener 15 focos, uno por día');
  assert(new Set(FOCI.map(f=>f[0])).size===15,'Nivel 3 repite títulos de foco');
  assert(FOCI.every(f=>f[0]&&f[1]&&f[1].length>=70),'Hay focos sin explicación o aplicación suficiente');
  const level3=LESSONS.filter(l=>l.day>=31&&l.day<=45);
  assert(level3.length===15&&level3.every((l,i)=>l.theoryIndex===i&&l.desc.includes(FOCI[i][1])),'Las quince lecciones no usan su foco correspondiente');
  pass('Nivel 3 · 15 focos únicos','progresión sin repetición; cada día incluye concepto y aplicación al teclado');
 }catch(e){fail('Nivel 3 · 15 focos únicos',e)}

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
  const spanishCardResidue=/\\b(?:cuando|donde|después|mientras|todavía|hacia|cualquier|izquierda|derecha|además|también|aunque|luego|arriba|abajo|siguiente|primero|sonido|duración|posición|compás|pulso|silencio|semitono|tónica|tríada|síncopa|contratiempo|necesitás|tenés|podés|querés|sabés|estás|tocá|escuchá|leé|encontrá|usá|prepará|mantené|reconocé|resolvé|explicá|observá|volvé|corregí|practicá|completá|construí|memorizá|uní|cantá|bajá|subí|elegí|identificá|marcá|compará|repetí|trasladá|evitá)\\b/i;
  try{pianoLanguage='pt';for(const lesson of LESSONS){const html=lessonCard(lesson);showHTML(html);const text=document.querySelector('#main').innerText||'',normalizedText=text.toLocaleLowerCase('pt-BR'),expectedTitle=pianoTranslateText(lesson.title),expectedDesc=pianoTranslateText(lesson.desc),skill=labels[lesson.skill]||lesson.skill,debug={id:lesson.id,language:pianoLanguage,html:html.slice(0,220),rendered:text.slice(0,220)};if(!normalizedText.includes(('Dia '+lesson.day).toLocaleLowerCase('pt-BR')))issues.push({...debug,issue:'day label'});if(!normalizedText.includes(('· '+skill).toLocaleLowerCase('pt-BR')))issues.push({...debug,issue:'skill label',skill});if(!normalizedText.includes(expectedTitle.toLocaleLowerCase('pt-BR'))||!normalizedText.includes(expectedDesc.toLocaleLowerCase('pt-BR')))issues.push({...debug,issue:'title/description not rendered in Portuguese'});const residue=text.match(spanishCardResidue);if(residue)issues.push({...debug,issue:'Spanish residue in rendered card',word:residue[0]});if(!text.includes('Treinar')&&!text.includes('Revisar'))issues.push({...debug,issue:'action label'})}}finally{pianoLanguage=oldLanguage}
  assert(issues.length===0,'Há cartões de lição incompletos em português: '+JSON.stringify(issues.slice(0,10)));
  pass('Cartões das 90 lições em português','dia, competência, título, descrição e ação localizados');
 }catch(e){fail('Cartões das 90 lições em português',e)}


 // Block A · stronger Portuguese audit: inspect the actual rendered exercise screens, not the translator's own expected output.
 try{
  const previousLanguage=pianoLanguage,previousDay=state.day,issues=[];
  const spanishOnly=/\b(?:cuando|donde|cuándo|dónde|cuánto|cuántos|cuántas|cómo|quién|quiénes|después|mientras|todavía|hacia|escriben|escribe|debe|deben|debajo|encima|cualquier|cualquiera|izquierda|derecha|además|también|aunque|luego|lejos|cerca|arriba|abajo|siguiente|siguientes|mismo|misma|mismos|mismas|mejor|peor|ahora|primero|primera|tercero|sonido|sonidos|duración|posición|compás|pulso|silencio|semitono|tono|octava|mayor|tónica|tríada|tríadas|arpegio|inversión|cadencia|síncopa|contratiempo|necesitás|tenés|podés|querés|sabés|estás|están|tocá|escuchá|leé|encontrá|usá|prepará|mantené|reconocé|resolvé|explicá|observá|volvé|corregí|practicá|completá|formá|construí|memorizá|uní|cantá|bajá|subí|elegí|identificá|marcá|compará|repetí|regresá|trasladá|evitá|dejá)\b/i;
  try{
   pianoLanguage='pt';state.day=90;applyPianoLanguage();
   for(const lesson of LESSONS){
    openLesson(lesson.id);clearTimeout(window._nextTimer);
    const rendered=document.getElementById('main')?.innerText||'',match=rendered.match(spanishOnly);
    if(match)issues.push({scope:'curso',id:lesson.id,word:match[0],text:rendered.slice(0,260)});
   }
   for(const lesson of THEORY_LESSONS){
    openTheory(lesson.id);
    const rendered=document.getElementById('main')?.innerText||'',match=rendered.match(spanishOnly);
    if(match)issues.push({scope:'academia',id:lesson.id,word:match[0],text:rendered.slice(0,260)});
   }
  }finally{pianoLanguage=previousLanguage;state.day=previousDay;applyPianoLanguage();show('course')}
  assert(issues.length===0,'Texto en español o traducción incompleta en pantallas portuguesas: '+JSON.stringify(issues.slice(0,12)));
  pass('Português · auditoría de pantallas 180/180','90 ejercicios del curso y 90 lecciones de teoría inspeccionados en portugués');
 }catch(e){fail('Português · auditoría de pantallas 180/180',e)}

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

 // Level 4 · ensure the fifteen harmony lessons form a distinct, ordered curriculum.
 try{
  const harmony=LESSONS.filter(x=>x.kind==='chordgeneric').sort((a,b)=>a.day-b.day);
  assert(harmony.length===15,'Nivel 4 no contiene quince prácticas de armonía');
  assert(harmony.every((lesson,i)=>lesson.day===46+i&&lesson.chordTheoryIndex===i),'las prácticas de armonía no siguen el orden T01–T15');
  assert(new Set(harmony.map(x=>x.title.split(' · ')[0])).size===15,'hay títulos repetidos en las quince prácticas de armonía');
  assert(harmony.every(x=>Array.isArray(x.targetChords)&&x.targetChords.length===4&&x.desc.length>100),'hay una práctica de armonía sin progresión o consigna específica');
  assert(CHORD_THEORY.length===15&&CHORD_THEORY.every((theory,i)=>theory.topic===harmony[i].title.split(' · ')[0]),'el foco pedagógico no coincide con la explicación y evaluación de armonía');
  pass('Nivel 4 · progresión de armonía','15 focos distintos: tríadas, inversiones, cifrado, funciones, cadencia y conducción de voces');
 }catch(e){fail('Nivel 4 · progresión de armonía',e)}

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

 // MIDI pitch diagnostics: incoming note number, scientific pitch and frequency must agree.
 try{
  assert(midiNoteDiagnosticLabel(60).includes('MIDI 60'),'Do central no conserva el número MIDI 60');
  assert(midiNoteDiagnosticLabel(60).includes('C4'),'Do central no se interpreta como C4');
  assert(midiNoteDiagnosticLabel(69).includes('440.00 Hz'),'La frecuencia de A4 no es 440 Hz');
  assert(midiNoteDiagnosticLabel(72).includes('MIDI 72'),'La octava superior no conserva MIDI 72');
  pass('MIDI · diagnóstico de altura exacta','C4=60, A4=69/440 Hz y C5=72');
 }catch(e){fail('MIDI · diagnóstico de altura exacta',e)}

 // Smoke all main exercise views.
 try{
  const views=['home','course','practice','reading','rhythmReading','twoHands','phrases','technique','midiStudio','repertoire','ear','earAdvanced','accompaniment','progress','teacher','spaced','resources','settings','finalExam'];
  for(const v of views){show(v);assert(document.getElementById('main')?.innerHTML.length>0,`vista vacía: ${v}`)}
  pass('19 vistas principales','todas renderizan, incluido el examen final');
 }catch(e){fail('18 vistas principales',e)}

 // Reading: verify octaves remain visible in the learner's submitted sequence and duplicate phrases do not farm skill points.
 try{show('reading');readingExpectedSeq=['C4','C5'];readingStage='name';readingNamedSeq=['C4','C5'];assert(readingView().includes('Do4 · Do5'),'la secuencia visual oculta la octava');readingExpectedSeq=['C4'];readingStage='play';readingPlayedSeq=[60];const before=state.skills.orientation||0;checkReading();assert(readingStage==='done','respuesta correcta no aceptada');const credited=state.skills.orientation||0;readingExpectedSeq=['C4'];readingStage='play';readingPlayedSeq=[60];checkReading();assert((state.skills.orientation||0)===credited,'la misma frase volvió a sumar puntos');assert(credited>=before,'el progreso se redujo');pass('Lectura musical','octavas visibles + acreditación única por frase')}catch(e){fail('Lectura musical',e)}
 // Rhythm reading: the current rhythm model stores steps (note/rest + duration), not a legacy beats array.
 try{showHTML(rhythmReadingView());newRhythmReading();renderRhythmReading();rhythmReadingCountdownTimer=setTimeout(()=>{},10000);rhythmReadingArmed=true;newRhythmReading();assert(rhythmReadingCountdownTimer===null&&!rhythmReadingArmed,'Nueva lectura no canceló el conteo pendiente');const rhythmUnit=rhythmQuarterDurationMs();const rhythmTotals=RHYTHM_PATTERNS.map(pattern=>({id:pattern.id,total:pattern.steps.reduce((sum,step)=>sum+step[1],0),expected:Number(pattern.meter.split('/')[0])*4/Number(pattern.meter.split('/')[1])}));assert(rhythmTotals.every(item=>Math.abs(item.total-item.expected)<0.001),'hay patrones que no completan la duración de su compás');assert(RHYTHM_PATTERNS.some(pattern=>pattern.meter==='2/4')&&RHYTHM_PATTERNS.some(pattern=>pattern.meter==='3/4')&&RHYTHM_PATTERNS.some(pattern=>pattern.meter==='6/8'),'faltan compases de 2/4, 3/4 o 6/8');rhythmReadingTimes=rhythmPatternAttacks(rhythmReadingPattern).map(beat=>beat*rhythmUnit);rhythmReadingArmed=true;checkRhythmReading();assert(!rhythmReadingArmed,'ritmo no cerró el ejercicio');assert(state.god.rhythmAssessment.mastered.includes(rhythmReadingPattern.id),'no guardó el patrón rítmico');for(const pattern of RHYTHM_PATTERNS){rhythmReadingPattern=pattern;rhythmReadingTempoOverride=null;const unit=rhythmQuarterDurationMs();rhythmReadingTimes=rhythmPatternAttacks(pattern).map(beat=>beat*unit);rhythmReadingArmed=true;checkRhythmReading();}assert(state.god.rhythmAssessment.mastered.length===RHYTHM_PATTERNS.length,'no se pudieron dominar todos los patrones rítmicos');const attacks=rhythmPatternAttacks(rhythmReadingPattern),feedbackUnit=rhythmQuarterDurationMs();rhythmReadingTimes=attacks.map(beat=>beat*feedbackUnit+250);rhythmReadingArmed=true;checkRhythmReading();assert(document.getElementById('rhythmReadingMsg').textContent.includes('Ataque 1'),'feedback rítmico no identifica el ataque desviado');pass('Lectura rítmica','cancelación de conteo + ataques derivados de steps + dominio + feedback por ataque')}catch(e){fail('Lectura rítmica',e)}
 // Beginner accessibility: repertoire is intentionally open without completing theory first.
 try{state=clone(defaultState);state.theory=state.theory||{completed:{},xp:0};state.theory.completed={};show('repertoire');assert(!document.getElementById('main').textContent.includes('Primero entendamos esto'),'repertorio bloqueó al principiante por teoría');assert(document.getElementById('main').textContent.includes('Amanecer'),'repertorio no ofrece la primera pieza');pass('Acceso inicial al repertorio','principiante puede empezar sin prerequisitos teóricos')}catch(e){fail('Acceso inicial al repertorio',e)}

 // Two hands.
 try{newTwoHands();startTwoHands();for(const ev of twoHandsPhrase.events)for(const n of ev.left.concat(ev.right))registerTwoHandsNote(n);const twoHandsBeat=60000/twoHandsPhrase.tempo;twoHandsTimes=twoHandsPhrase.events.map((_,i)=>i*twoHandsBeat);checkTwoHands();assert(twoHandsAwarded,'dos manos no otorgó dominio');pass('Dos manos','todos los bloques coordinados')}catch(e){fail('Dos manos',e)}
 // Curso de dos manos: cada bloque debe reunirse en una ventana acotada, sin asumir cuatro notas.
 try{
  courseTwoHandsEvents=[{left:[48,52,55],right:[60]},{left:[48],right:[62,64]}];
  courseTwoHandsStep=0;courseTwoHandsWindow=[];courseTwoHandsStarted=true;clearTimeout(courseTwoHandsWindowTimer);courseTwoHandsWindowTimer=null;
  registerCourseTwoHandsNote(48);
  assert(!!courseTwoHandsWindowTimer,'no se activó el límite temporal del bloque');
  clearCourseTwoHands();
  assert(courseTwoHandsWindowTimer===null&&!courseTwoHandsStarted,'reiniciar no limpió el temporizador y el intento');
  startCourseTwoHands();
  for(const n of [48,52,55,60])registerCourseTwoHandsNote(n);
  assert(courseTwoHandsStep===1,'el patrón de cuatro notas no se reconoció');
  for(const n of [48,62,64])registerCourseTwoHandsNote(n);
  assert(courseTwoHandsStep===2,'el patrón variable de tres notas no se reconoció');
  clearCourseTwoHands();
  pass('Dos manos · ventana y patrones variables','descarta notas dispersas y valida bloques con cantidades distintas');
 }catch(e){fail('Dos manos · ventana y patrones variables',e)}
 // Technique.
 try{newTechnique();startTechnique();const beat=60000/techniqueExercise.tempo;let techniqueElapsed=0;techniqueTimes=techniqueExercise.notes.map((_,i)=>{const at=techniqueElapsed;techniqueElapsed+=(techniqueExercise.dur?.[i]||1)*beat;return at});techniqueStep=techniqueExercise.notes.length;checkTechnique();assert(techniqueAwarded,'técnica no aprobó');pass('Técnica/digitación','secuencia + pulso aceptados')}catch(e){fail('Técnica/digitación',e)}
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
  if(typeof window.stopRepertoirePractice==='function')window.stopRepertoirePractice();else if(typeof window.stopBackingTrack==='function')window.stopBackingTrack();repertoireTempoOverride=null;
  originalPiece.notes=originalNotes;originalPiece.dur=originalDur;
  pass('Repertorio progresivo','aprendizaje por altura + lectura con octava + memoria sin pistas + tempo ajustable');
 }catch(e){fail('Repertorio progresivo',e);repertoireTempoOverride=null;if(typeof window.stopRepertoirePractice==='function')window.stopRepertoirePractice();else if(typeof window.stopBackingTrack==='function')window.stopBackingTrack()}
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

 // Imported MIDI regression: wrong notes provide corrective feedback and keep the learner on the same target.
 try{
  state=clone(defaultState);state.god.library=[{id:'midi-regression',source:'midi',data:{sequence:[{midi:60,startMs:0,track:0},{midi:62,startMs:500,track:0}]}}];
  importedSongPractice={songId:'midi-regression',index:0,correct:0,errors:0,history:[],active:true,tempoScale:.75,message:'',playToken:0,playing:false,paused:false,offsetMs:0,currentNotes:[],mode:'wait',waiting:true,waitGroup:[{midi:60,startMs:0,track:0}],waitGroupStart:0,waitGroupEnd:1,phraseStart:0,phraseEnd:2,waitRemaining:new Set([0]),trackFilter:null,handFilter:'both'};
  showHTML(godSongPractice());
  registerImportedSongPractice(61);
  assert(importedSongPractice.errors===1,'no registró el error de la nota MIDI');
  assert(importedSongPractice.history.length===1&&importedSongPractice.history[0].correct===false,'no conservó el detalle de la nota equivocada');
  assert(importedSongPractice.index===0,'la práctica avanzó al cometer un error');
  assert(importedSongPractice.waitRemaining.has(0)&&importedSongPractice.waiting===true,'el error quitó el objetivo o dejó de esperar');
  assert(document.getElementById('importedSongFeedback').textContent.includes('Se esperaba'),'no explicó la corrección esperada');
  registerImportedSongPractice(60);
  assert(importedSongPractice.index===1,'no avanzó tras corregir la nota');
  pass('Canciones MIDI · feedback correctivo','registra el error, mantiene el objetivo y avanza solamente tras la corrección');
 }catch(e){fail('Canciones MIDI · feedback correctivo',e)}

 // Imported MIDI phrase segmentation follows meter and two-bar boundaries.
 try{
  const seq=Array.from({length:20},(_,i)=>({midi:60+(i%5),startMs:i*500,durationMs:350}));
  const first=importedSongPhraseBounds(seq,6,{tempo:120,meter:{numerator:4,denominator:4}});
  const second=importedSongPhraseBounds(seq,10,{tempo:120,meter:{numerator:4,denominator:4}});
  assert(first.start===0&&first.end===8,'la primera frase no agrupó dos compases de 4/4');
  assert(second.start===8&&second.end===16,'la segunda frase no comenzó en el siguiente límite de dos compases');
  const triple=importedSongPhraseBounds(seq,5,{tempo:120,meter:{numerator:3,denominator:4}});
  assert(triple.start===0&&triple.end===6,'no respetó el compás de 3/4');
  pass('Canciones MIDI · frases musicales','frases de dos compases alineadas a 4/4 y 3/4');
 }catch(e){fail('Canciones MIDI · frases musicales',e)}

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

 // Final autonomy exam: nine practical stages must be demonstrated again and persist as one attempt.
 const finalExamPreviousLanguage=pianoLanguage;
 try{
  pianoLanguage='es';
  state=normalizeState(clone(defaultState));state.day=90;state.lessons=Object.fromEntries(LESSONS.map(l=>[l.id,true]));state.xp=123;
  state.god.finalExam={running:false,completed:false,passed:{},currentLessonId:null,startedAt:null,completedAt:null,updatedAt:'',attempts:0};
  assert(FINAL_EXAM_TASKS.length===9,'el examen no contiene nueve competencias prácticas');
  assert(FINAL_EXAM_TASKS.every(t=>LESSONS.some(l=>l.id===t.id)),'el examen referencia una lección inexistente');
  startFinalExam();
  assert(state.god.finalExam.running&&state.god.finalExam.currentLessonId===FINAL_EXAM_TASKS[0].id,'el examen no comenzó por la primera etapa');
  for(let i=0;i<FINAL_EXAM_TASKS.length;i++){
   const task=FINAL_EXAM_TASKS[i];
   if(i>0)continueFinalExam();
   assert(state.god.finalExam.currentLessonId===task.id,'el examen no avanzó a '+task.id);
   completeCore(task.id);
   assert(!!state.god.finalExam.passed[task.id],'no registró la aprobación de '+task.id);
  }
  assert(state.god.finalExam.completed&&!state.god.finalExam.running,'el examen no cerró como aprobado');
  assert(Object.keys(state.god.finalExam.passed).length===9,'el resultado final no contiene las nueve etapas');
  assert(state.xp===123,'repetir las lecciones del examen otorgó XP duplicada');
  assert(finalExamView().includes('9/9'),'la pantalla final no muestra el resultado completo');
  pianoLanguage=finalExamPreviousLanguage;
  pass('Examen final de autonomía','nueve competencias demostradas, avance secuencial, resultado persistente y sin XP duplicada');
 }catch(e){pianoLanguage=finalExamPreviousLanguage;fail('Examen final de autonomía',e)}
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
  if(typeof window.stopRepertoirePractice==='function')window.stopRepertoirePractice();else if(typeof window.stopBackingTrack==='function')window.stopBackingTrack();
  state.repertoireMilestones={};repertoirePiece=repertoireLibrary.find(x=>x.id==='rp1');
  markRepertoireMilestone('learn');assert(state.repertoireProgress.rp1===25,'aprendizaje no computó 25%');
  markRepertoireMilestone('read');assert(state.repertoireProgress.rp1===50,'lectura no computó 50%');
  markRepertoireMilestone('play');assert(state.repertoireProgress.rp1===100,'interpretación no completó 100%');
  pass('Repertorio · recuperación de las tres etapas','aprendizaje, lectura e interpretación retoman índice/notas y guardan 25/50/100%');
 }catch(e){fail('Repertorio · recuperación de las tres etapas',e);if(typeof window.stopRepertoirePractice==='function')window.stopRepertoirePractice();else if(typeof window.stopBackingTrack==='function')window.stopBackingTrack();}

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
  const oldTempoOverride=repertoireTempoOverride;bandPracticeActive=true;repertoireStarted=true;bandPracticeTotalBeats=12;bandPracticeElapsedBeats=0;bandPracticeCurrentTempo=60;bandPracticeTempoAt=performance.now()-1000;setRepertoireTempo(120);
  assert(bandPracticeElapsedBeats>=.9&&bandPracticeCurrentTempo===120&&bandPracticeTimer!==null,'el cambio de BPM no recalculó el tiempo restante de la sesión');
  (typeof window.stopBackingTrack==='function'&&window.stopBackingTrack());assert(!bandPracticeActive&&!repertoireStarted&&bandPracticeTotalBeats===0,'detener la base dejó activa la práctica');repertoireTempoOverride=oldTempoOverride;
  pass('Práctica con banda · dos pasadas','registra errores sin bloquear, avanza a la nota siguiente, adapta la duración al BPM y detiene el audio al completar dos vueltas');
 }catch(e){fail('Práctica con banda · dos pasadas',e);bandPracticeActive=false;repertoireStarted=false;(typeof window.stopBackingTrack==='function'&&window.stopBackingTrack())}

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
  accomp.running=true;accomp.timer=setTimeout(()=>{},60000);backingTrackTimer=setTimeout(()=>{},60000);
  show('home');
  assert(!accomp.running&&accomp.timer===null,'el audio siguió activo al salir de Acompañamiento');
  assert(backingTrackTimer===null,'el acompañamiento de Repertorio siguió programado al cambiar de pantalla');
  state.theory=state.theory||{completed:{},practice:{},xp:0};state.theory.completed=state.theory.completed||{};['T29','T30','T31','T32','T33','T34'].forEach(id=>state.theory.completed[id]=true);
  setAccStyle('Rock');assert(accomp.style==='Rock'&&accomp.bpm===112,'el estilo Rock no aplicó su tempo');
  setAccProgression(3);assert(accomp.progression.join('-')==='Am-Dm-G-C','la progresión seleccionada no se aplicó');
  show('accompaniment');assert((document.getElementById('main')?.innerText||'').includes('Am–Dm–G–C'),'la cuarta progresión no aparece disponible en la interfaz');
  accomp=savedAccomp;accTick=savedTick;
  pass('Acompañamiento · control de reproducción','inicia, detiene, cambia estilos/progresiones y corta el audio al navegar fuera');
 }catch(e){fail('Acompañamiento · control de reproducción',e);if(typeof accomp!=='undefined'&&accomp){if(accomp.timer)clearTimeout(accomp.timer);accomp.running=false;accomp.timer=null}}
 
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
  let arrangementReleased=false;fullArrangementTimer=setTimeout(()=>{},60000);fullArrangementResolve=()=>{arrangementReleased=true};stopFullArrangement();
  assert(arrangementReleased&&fullArrangementTimer===null&&fullArrangementResolve===null,'Detener no liberó la espera pendiente de la guía musical');
  accomp.running=true;accomp.timer=setTimeout(()=>{},60000);backingTrackTimer=setTimeout(()=>{},60000);bandPracticeActive=true;repertoireStarted=true;let backingVoicesStopped=0,accompVoicesStopped=0;window._autonomiaBackingSources=new Set([{stop(){backingVoicesStopped++}}]);window._autonomiaAccompanimentSources=new Set([{stop(){accompVoicesStopped++}}]);renderSequenceStopControl(true);document.getElementById('sequenceStopControl').click();
  assert(!accomp.running&&accomp.timer===null&&backingTrackTimer===null,'el botón global no detuvo todos los motores de audio');
  assert(!bandPracticeActive&&!repertoireStarted,'el botón global dejó activa la sesión de práctica de repertorio');
  assert(backingVoicesStopped===1&&accompVoicesStopped===1&&window._autonomiaBackingSources.size===0&&window._autonomiaAccompanimentSources.size===0,'quedaron voces ya programadas sonando después de la parada global');
  midiOutput=previousOutput;
  pass('Reproducción · detener y navegar','cancela notas pendientes, no dispara ataques posteriores y se detiene al cambiar de pantalla');
 }catch(e){fail('Reproducción · detener y navegar',e);if(typeof window.stopSequencePlayback==='function')window.stopSequencePlayback()}


 // Point 3: keyboard must remain compact after navigation and never consume the viewport.
  try{
   const keyboardCheck=(label)=>{
    const piano=document.querySelector('#main .keys.responsive-piano-keys');
    assert(piano,label+': no se renderizó el teclado didáctico');
    assert(piano.querySelectorAll('.key').length===61,label+': no hay exactamente 61 teclas');
    const css=getComputedStyle(piano),rect=piano.getBoundingClientRect(),viewport=Math.max(1,window.innerHeight);
    assert(css.position==='relative',label+': el teclado no está integrado al flujo del contenido');
    assert(rect.height<=viewport*.22+2,label+': el teclado ocupa más del 22% de la altura visible ('+Math.round(rect.height)+'px / '+viewport+'px)');
    const main=document.getElementById('main'),mainRect=main.getBoundingClientRect();
    assert(rect.left>=mainRect.left-1&&rect.right<=mainRect.right+1,label+': el teclado excede el ancho del contenido');
    assert(piano.offsetParent!==null&&main.contains(piano),label+': el teclado no participa del flujo de la página');
    assert(piano.scrollWidth<=piano.clientWidth+1,label+': las 61 teclas exceden el ancho visible');
   };
   show('keyboard');keyboardCheck('entrada al mapa');
   show('practice');show('keyboard');keyboardCheck('volver desde práctica');
   show('course');show('keyboard');keyboardCheck('volver desde lecciones');
    pass('Teclado · 61 teclas compactas tras navegar','verifica posición en flujo, altura, ancho y navegación entre secciones');
  }catch(e){fail('Teclado · 61 teclas compactas tras navegar',e)}

 
 // Block 4: band practice progress is saved after every note and can be resumed.
 try{
  const originalState=state,originalPiece=repertoirePiece,originalResults=bandPracticeResults,originalInput=repertoireInput;
  try{
   state=clone(defaultState);repertoirePiece=repertoireLibrary[0];
   bandPracticeResults=[{played:60,expected:62,correct:false,name:'Do',oct:4},{played:62,expected:62,correct:true,name:'Re',oct:4}];
   repertoireInput=bandPracticeResults.map(x=>x.played);
   saveBandRepertoireSession();
   const restored=loadState(),session=restored.repertoireSessions?.[repertoirePiece.id];
   assert(session?.mode==='band-play'&&session.index===2,'la sesión con banda no se guardó como reanudable');
   assert(session.notes.join(',')==='60,62'&&session.results.length===2&&!session.results[0].correct&&session.results[1].correct,'se perdieron notas o errores intermedios de la banda');
   assert(String(startBandPractice).includes("savedSession.mode==='band-play'"),'la práctica con banda no reconoce una sesión guardada para reanudar');
   pass('Persistencia · repertorio con banda','guarda cada nota/error y permite reanudar una sesión interrumpida');
  }finally{
   state=originalState;repertoirePiece=originalPiece;bandPracticeResults=originalResults;repertoireInput=originalInput;saveState();
  }
 }catch(e){fail('Persistencia · repertorio con banda',e)}

 // Block 4: real persistence round-trip for course, practice and imported repertoire.
 try{
  const originalState=state;
  state=clone(defaultState);
  state.day=4;state.xp=125;state.lessons={l1:true,l2:true,l3:true};
  state.freePracticeHistory={C:[{at:'2026-11-17T10:00:00.000Z',notes:12,accuracy:92}]};
  state.repertoireProgress={rp1:75};
  state.repertoireMilestones={rp1:{learn:true,read:true,play:false}};
  state.repertoireSessions={rp1:{mode:'play',index:8,notes:[60,62,64],updatedAt:'2026-11-17T10:05:00.000Z'}};
  state.repertoireAttempts={rp1:[{at:'2026-11-17T10:06:00.000Z',accuracy:88,correct:22,total:25,mode:'play'}]};
  state.god.imports=[{id:'import-test',name:'Tema.mid',type:'mid',status:'Listo'}];
  state.god.music={tracks:[{id:'import-test',name:'Tema.mid',sequence:[{midi:60,startMs:0,durationMs:300}]}],songPractice:{'import-test':{index:1,correct:1,errors:0,history:[{at:'2026-11-17T10:07:00.000Z',note:'Do4',correct:true}]}}};
  assert(saveState(),'saveState no confirmó la escritura local');
  const reloaded=loadState();
  assert(reloaded.lessons.l1&&reloaded.lessons.l2&&reloaded.lessons.l3&&reloaded.day>=4,'el curso no sobrevivió al ciclo guardar/recargar');
  assert(reloaded.freePracticeHistory.C?.[0]?.accuracy===92,'se perdió el historial de práctica libre');
  assert(reloaded.repertoireProgress.rp1===75&&reloaded.repertoireSessions.rp1.index===8,'se perdió el progreso o la sesión de repertorio');
  assert(reloaded.repertoireAttempts.rp1?.[0]?.accuracy===88,'se perdió el resultado de una práctica de repertorio');
  assert(reloaded.god.music.tracks?.[0]?.sequence?.[0]?.midi===60&&reloaded.god.music.songPractice['import-test']?.history?.length===1,'se perdió la canción importada o su historial');
  assert(reloaded.god.imports?.[0]?.name==='Tema.mid','se perdió el registro de importación');
  pass('Persistencia · ciclo guardar y recargar','curso, práctica libre, repertorio, resultados y canción importada sobreviven a loadState()');
 }catch(e){fail('Persistencia · ciclo guardar y recargar',e)}

 // Block 4: merging two partial backups must retain progress from both devices.
 try{
  const a=clone(defaultState),b=clone(defaultState);
  a.day=2;a.lessons={l1:true};a.repertoireAttempts={rp1:[{at:'2026-11-16T10:00:00.000Z',accuracy:70}]};a.god.music={tracks:[{id:'song-a',name:'A.mid',sequence:[{midi:60}]}],songPractice:{}};
  b.day=3;b.lessons={l2:true};b.repertoireAttempts={rp1:[{at:'2026-11-17T10:00:00.000Z',accuracy:90}]};b.god.music={tracks:[{id:'song-b',name:'B.mid',sequence:[{midi:64}]}],songPractice:{}};
  const merged=mergeProgressStates(a,b);
  assert(merged.lessons.l1&&merged.lessons.l2,'la fusión perdió lecciones completadas en uno de los perfiles');
  assert(merged.repertoireAttempts.rp1?.length===2,'la fusión no conservó ambos intentos de repertorio');
  assert(merged.god.music.tracks.some(x=>x.id==='song-a')&&merged.god.music.tracks.some(x=>x.id==='song-b'),'la fusión perdió una canción importada');
  pass('Persistencia · fusión de respaldos','conserva lecciones, intentos y canciones importadas de dos perfiles parciales');
 }catch(e){fail('Persistencia · fusión de respaldos',e)}

 // Block 4: IndexedDB backup can restore progress independently from localStorage.
 try{
  const originalState=state;
  const fixture=clone(defaultState);fixture.day=2;fixture.lessons={l1:true};fixture.xp=15;
  fixture.god=fixture.god||{};fixture.god.music={tracks:[{id:'idb-song',name:'Respaldo.mid',sequence:[{midi:67}]}],songPractice:{}};
  const written=await writeProgressIndexedDB(JSON.stringify(fixture));
  assert(written===true,'no se pudo escribir el respaldo IndexedDB');
  state=clone(defaultState);state.day=3;state.lessons={l2:true};state.xp=25;
  const restored=await restoreProgressIndexedDB();
  assert(restored.ok,'falló la lectura del respaldo IndexedDB');
  assert(state.lessons.l1&&state.lessons.l2,'la recuperación no fusionó el respaldo con el estado local');
  assert(state.god.music.tracks.some(x=>x.id==='idb-song'),'la recuperación perdió la canción guardada en IndexedDB');
  assert(state.xp===25,'la recuperación reemplazó indebidamente el XP local más alto');
  state=originalState;
  pass('Persistencia · recuperación IndexedDB','restaura canciones y progreso del respaldo sin borrar el avance local más reciente');
 }catch(e){fail('Persistencia · recuperación IndexedDB',e)}

 // Block 4: a failed secondary localStorage copy must not prevent the IndexedDB write attempt.
 try{
  const originalSet=localStorage.setItem.bind(localStorage),originalWriter=writeProgressIndexedDB;
  let idbCalled=false;
  localStorage.setItem=function(key,value){if(key==='autonomia-piano-progress-backup')throw Error('fallo simulado de copia secundaria');return originalSet(key,value)};
  writeProgressIndexedDB=function(snapshot){idbCalled=!!snapshot;return Promise.resolve(true)};
  try{persistProgressOnExit()}finally{localStorage.setItem=originalSet;writeProgressIndexedDB=originalWriter}
  assert(idbCalled,'un fallo de la copia secundaria impidió intentar IndexedDB');
  pass('Persistencia · copias independientes al salir','IndexedDB se intenta aunque falle la copia secundaria de localStorage');
 }catch(e){fail('Persistencia · copias independientes al salir',e)}

 // Block B · honest limits of the coordination evaluator in both languages.
 try{
  const oldLang=pianoLanguage,oldDay=state.day,oldData=courseTwoHandsLessonData,oldEvents=courseTwoHandsEvents.slice(),oldStep=courseTwoHandsStep,oldWindow=courseTwoHandsWindow.slice(),oldStarted=courseTwoHandsStarted;
  try{
   pianoLanguage='es';state.day=90;courseTwoHandsLesson(LESSONS.find(x=>x.id==='l61'));clearTimeout(courseTwoHandsWindowTimer);
   const es=document.getElementById('courseTwoHandsMsg')?.textContent||'';
   assert(/no mide todavía la duración sostenida/i.test(es),'La pantalla española no aclara que no evalúa duración sostenida');
   pianoLanguage='pt';courseTwoHandsLesson(LESSONS.find(x=>x.id==='l61'));clearTimeout(courseTwoHandsWindowTimer);
   const pt=document.getElementById('courseTwoHandsMsg')?.textContent||'';
   assert(/não mede a duração sustentada/i.test(pt),'A tela em português não esclarece que não avalia duração sustentada');
  }finally{pianoLanguage=oldLang;state.day=oldDay;courseTwoHandsLessonData=oldData;courseTwoHandsEvents=oldEvents;courseTwoHandsStep=oldStep;courseTwoHandsWindow=oldWindow;courseTwoHandsStarted=oldStarted;clearTimeout(courseTwoHandsWindowTimer)}
  pass('Nivel 5 · honestidad de evaluación ES/PT','La pantalla distingue comprobación de alturas agrupadas de duración y precisión temporal');
 }catch(e){fail('Nivel 5 · honestidad de evaluación ES/PT',e)}
 // Block D: settings must expose real local backup controls and never promise unavailable cloud sync.
 try{
  pianoLanguage='es';show('settings');
  let visible=document.getElementById('main')?.innerText||'';
  assert(visible.includes('Exportar respaldo')&&visible.includes('Importar respaldo'),'Sistema no ofrece exportar e importar el respaldo local');
  assert(visible.includes('todavía no disponibles'),'Sistema no aclara que la nube/cuentas aún no están activas');
  assert(!document.querySelector('#main button[onclick*="cloudRegister"],#main button[onclick*="cloudLogin"]'),'Sistema sigue ofreciendo registro o inicio de sesión sin backend');
  pianoLanguage='pt';show('settings');
  visible=document.getElementById('main')?.innerText||'';
  assert(visible.includes('Exportar backup')&&visible.includes('Importar backup'),'As opções de backup não aparecem em português');
  assert(visible.includes('ainda não disponíveis'),'A tela em português não esclarece o estado da nuvem');
  pass('Sistema · respaldo local honesto','exportación/importación visibles en ES/PT y nube deshabilitada hasta tener backend real');
 }catch(e){fail('Sistema · respaldo local honesto',e)}
 // Block C · the melody demonstration must play with a real rhythmic band, not isolated notes.
 try{
  const demo=playRepertoireDemo.toString(),arrangement=playFullArrangement.toString();
  assert(demo.includes('playFullArrangement()'),'La demostración principal todavía reproduce notas aisladas');
  assert(arrangement.includes('startBackingTrack(false)'),'La versión guía no inicia bajo, acordes y batería');
  assert(arrangement.includes('p.dur[i]'),'La melodía no respeta las duraciones escritas');
  assert(arrangement.includes('for(let pass=0;pass<2;pass++)'),'La guía no ofrece dos pasadas completas');
  pass('Repertorio · melodía con banda y ritmo','La demostración principal usa melodía + bajo + acordes + batería, duraciones y dos pasadas');
 }catch(e){fail('Repertorio · melodía con banda y ritmo',e)}
 // Imported MusicXML · preserve real note lengths, rests and simultaneous chord notes.
 try{
  const fixture='<score-partwise version="3.1"><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1"><measure number="1"><attributes><divisions>2</divisions></attributes><note><pitch><step>C</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note><note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note><note><pitch><step>D</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note><note><rest/><duration>2</duration></note><note><pitch><step>G</step><octave>4</octave></pitch><duration>2</duration><voice>1</voice></note></measure></part></score-partwise>';
  const parsed=parseMusicXML(fixture),times=parsed.sequence.map(n=>n.startMs);
  assert(parsed.notes===4,'MusicXML no conservó las cuatro notas con altura');
  assert(times.join(',')==='0,0,500,1500','MusicXML perdió simultaneidad, duración o silencio: '+times.join(','));
  assert(parsed.sequence.every(n=>n.durationMs===500),'MusicXML no convirtió las duraciones según divisions y tempo');
  assert(parsed.sequence[0].track===0&&parsed.sequence[0].voice==='1','MusicXML perdió pista o voz');
  pass('MusicXML · ritmo, silencios y acordes','conserva ataques simultáneos, duración de negras y silencio de un pulso');
 }catch(e){fail('MusicXML · ritmo, silencios y acordes',e)}
 // MIDI format 1 · same pitch/channel in separate tracks must never cross-pair note-off events.
 try{
  const ascii=x=>Array.from(x).map(c=>c.charCodeAt(0));
  const be16=n=>[(n>>8)&255,n&255],be32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
  const chunk=(name,data)=>[...ascii(name),...be32(data.length),...data];
  const tr0=[0,0x90,60,90,0,0xff,0x2f,0];
  const tr1=[0,0x90,60,90,0x83,0x60,0x80,60,0,0,0xff,0x2f,0];
  const bytes=new Uint8Array([...ascii('MThd'),...be32(6),...be16(1),...be16(2),...be16(480),...chunk('MTrk',tr0),...chunk('MTrk',tr1)]);
  const parsed=parseMidiFile(bytes.buffer),notes=parsed.sequence.filter(n=>n.midi===60);
  assert(notes.length===2,'No se recuperaron las dos notas MIDI');
  assert(notes[0].track===0&&notes[1].track===1,'Se mezclaron las pistas de origen');
  assert(Math.abs(notes[0].durationMs-250)<2,'La nota sin note-off debería usar su duración de seguridad de 250 ms: '+notes[0].durationMs);
  assert(Math.abs(notes[1].durationMs-500)<2,'El note-off de la pista 2 se emparejó con la pista 1: '+notes[1].durationMs);
  pass('MIDI multipista · note-on/note-off aislados','dos notas iguales en canales/pistas diferentes conservan duración y pista correctas');
 }catch(e){fail('MIDI multipista · note-on/note-off aislados',e)}
 // Lesson 10 · the learner can hear the target melody at the exact evaluated pulse.
 try{
  const demo=playRhythm2Demo.toString(),view=rhythm2Lesson.toString();
  assert(demo.includes('playSeq(patternExpected,600,.42)'),'El modelo de la lección 10 no respeta el pulso evaluado de 600 ms');
  assert(view.includes('playRhythm2Demo()')&&view.includes('100 BPM'),'La lección no ofrece escuchar el modelo rítmico');
  assert(view.includes('Ouvir modelo'),'El botón del modelo rítmico no está traducido al portugués');
  pass('Lección 10 · melodía con modelo rítmico','la frase se escucha completa a 100 BPM antes de que el alumno la reproduzca');
 }catch(e){fail('Lección 10 · melodía con modelo rítmico',e)}
 // Free practice · score both pitch correctness and the timing between attacks.
 try{
  const even=freePracticeTimingResult([1000,1750,2500],[1,1,1],80);
  const uneven=freePracticeTimingResult([1000,2000,2500],[1,1,1],80);
  const single=freePracticeTimingResult([1000],[1],80);
  const slow=freePracticeTimingResult([1000,2034,3069],[1,1],58);
  assert(even.accuracy===100&&even.hits===2,'Un pulso regular no obtiene 100% de precisión rítmica');
  assert(uneven.accuracy===50&&uneven.errors[0].ok===false&&uneven.errors[1].ok===true,'No detecta el primer ataque fuera de pulso');
  assert(single.accuracy===null,'Una sola nota no debe recibir una puntuación rítmica engañosa');
  assert(slow.accuracy===100,'La evaluación no respeta el tempo lento de 58 BPM');
  assert(playFreePracticeSequence.toString().includes('freePracticeTempo=slow?58:80'),'La velocidad escuchada y la velocidad evaluada pueden quedar desincronizadas');
  const register=registerFreePracticeNote.toString(),render=renderFreePracticeStatus.toString();
  assert(register.includes('freePracticeInputTimes.push(Date.now())'),'No se registra el instante de cada nota');
  assert(render.includes('rhythmAccuracy:timing.accuracy')&&render.includes('timingErrorsMs'),'El historial no guarda el resultado rítmico');
  assert(render.includes('Pulso: '),'La devolución no muestra la precisión del pulso');
  assert(render.includes("freePracticeLabel(' correctas. ',' corretas. ')"),'La nueva devolución rompió el formato de aciertos ya utilizado por las pruebas existentes');
  pass('Práctica libre · evaluación de ritmo real','compara ataques con el pulso de 80 BPM, marca desvíos, separa precisión de notas y guarda ambos resultados');
 }catch(e){fail('Práctica libre · evaluación de ritmo real',e)}
 // Free practice · every exercise must offer a complete rhythmic model at normal and reduced tempo.
 try{
  const demo=playFreePracticeSequence.toString(),view=practice.toString();
  assert(demo.includes('scheduleToneEvents(events)'),'La práctica libre no reproduce un modelo con el motor de audio');
  assert(demo.includes('FREE_PRACTICE_DURATIONS'),'La práctica libre no aplica duraciones musicales a las secuencias');
  assert(demo.includes('slow?0.72:1'),'No existe una versión lenta para estudiar el movimiento');
  assert(view.includes('playFreePracticeSequence(false)')&&view.includes('playFreePracticeSequence(true)'),'La pantalla no ofrece escuchar el modelo normal y lento');
  assert(FREE_PRACTICE_DURATIONS.chromatic.join(',')==='1,0.5,0.5','El ejercicio cromático no demuestra la subdivisión rítmica');
  assert(FREE_PRACTICE_DURATIONS.arpeggio.length===FREE_PRACTICE_TARGETS.arpeggio.length,'El arpegio no tiene una duración asignada por nota');
  pass('Práctica libre · modelos rítmicos y tempo lento','las nueve actividades pueden escucharse completas a 80 BPM o al 72% de velocidad, con duraciones explícitas');
 }catch(e){fail('Práctica libre · modelos rítmicos y tempo lento',e)}
 // Technique exercises · students can hear the exact rhythmic model before playing.
 try{
  const demo=playTechniqueDemo.toString(),view=techniqueView.toString();
  assert(demo.includes('scheduleToneEvents(events)'),'La demostración no usa el motor de audio programado');
  assert(demo.includes('e.dur?.[i]'),'La demostración ignora las duraciones de cada nota');
  assert(demo.includes('at+=duration*1000'),'La demostración no mantiene el espacio temporal entre ataques');
  assert(view.includes('playTechniqueDemo()'),'La pantalla no ofrece escuchar el ejemplo');
  assert(view.includes('Escuchar ejemplo'),'El botón de escucha no está visible');
  pass('Técnica · ejemplo musical audible','reproduce la secuencia completa respetando negras, corcheas y notas sostenidas');
 }catch(e){fail('Técnica · ejemplo musical audible',e)}
 const failed=results.filter(x=>!x.ok); document.body.innerHTML='<h1>Autonomía Piano — TEST EXHAUSTIVO v40.0</h1><pre id="results">'+results.map(x=>(x.ok?'PASS ':'FAIL ')+x.name+(x.detail?' :: '+x.detail:'')).join('\n')+'\n\nTOTAL: '+results.length+' | PASS: '+(results.length-failed.length)+' | FAIL: '+failed.length+'</pre>';
 window.__TEST_RESULTS=results;
})();
