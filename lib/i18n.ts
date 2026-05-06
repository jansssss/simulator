export type Lang = "en" | "ko";

export const t = {
  en: {
    // Header
    appTitle: "Bio-R&D Orchestration",
    appSubtitle: "Terrestrial × Marine Convergence Platform",
    statDataSources: "Data Sources",
    statTarget: "Target",
    statStatus: "Status",
    statusRunning: "Running",
    statusComplete: "Complete",
    statusIdle: "Idle",
    engineVersion: "AI ENGINE v2.4.1",

    // Upload Section
    uploadSectionTitle: "Research Data Upload",
    uploadDrop: "Drop JSON file or click to upload",
    uploadHint: "Substance data in JSON format (.json)",
    uploadLoaded: "Dataset Loaded",
    uploadClear: "Clear data",
    uploadTotal: "Total",
    uploadTerrestrial: "Land",
    uploadMarine: "Marine",
    uploadErrorFormat: "Only .json files are supported.",
    uploadErrorParse: "Failed to parse JSON. Please check the file format.",
    uploadUsingCustom: "Using uploaded data",
    uploadUsingMock: "Using sample data",

    // Left Panel
    panelSettings: "Simulation Settings",
    sectionDataSources: "Data Sources",
    srcTerrestrial: "Terrestrial Natural Products",
    srcMarine: "Marine Bioactive Compounds",
    srcRegulatory: "Regulatory DB (FDA/EMA)",
    sectionPersona: "Simulation Persona",
    targetEfficacyLabel: "Target Efficacy",
    priorityWeights: "Priority Weights",
    priorityBioactivity: "Bioactivity",
    priorityStability: "Stability",
    prioritySynergy: "Synergy Potential",
    priorityToxicity: "Toxicity Threshold",
    sectionConstraints: "Human Knowledge Constraints",
    constraintsEmpty: "No constraints added yet.",
    constraintPlaceholder: "Add a constraint rule...",
    constraintAdd: "Add constraint",
    constraintRemove: "Remove",

    // Efficacy options
    efficacyOptions: [
      "Anti-Inflammatory",
      "Antioxidant",
      "Antimicrobial",
      "Antitumor",
      "Neuroprotection",
      "Immunomodulation",
      "Antiviral",
      "Cardioprotection",
    ],

    // Constraints
    constraints: [
      "Exclude hepatotoxic scaffolds",
      "MW < 700 Da (Lipinski)",
      "No reactive electrophiles",
      "GRAS-listed precursors only",
      "Marine-derived novelty required",
      "Patent space clearance check",
    ],

    // Center Panel
    engineTitle: "FUSION ALCHEMY ENGINE",
    engineSubtitle: "Terrestrial × Marine Convergence",
    iterationsLabel: "iterations",
    logLabel: "Simulation Log",
    logAwaiting: "Awaiting simulation start...",
    btnStart: "Start Simulation",
    btnStop: "Stop Simulation",
    layerMarine: "MARINE LAYER",
    layerTerrestrial: "TERRESTRIAL LAYER",
    layerSynergy: "SYNERGY",
    layerAdmet: "ADMET",
    badgeRunning: "RUNNING",

    // Right Panel
    panelResults: "Results & Analysis",
    foundLabel: "found",
    tabCandidates: "Top 10 Candidates",
    tabAnalysis: "Analysis",
    noResults: "Run simulation to discover candidates",
    dockingLabel: "Docking",
    scoreLabel: "Overall Score",
    efficacyProfile: "Efficacy Profile",
    admetProfile: "ADMET Profile",
    feedbackTitle: "Ph.D Feedback Loop",
    feedbackResearcher: "Researcher Name",
    feedbackDomain: "Ph.D Domain",
    feedbackEfficacy: "Observed Efficacy",
    feedbackStability: "Stability In Vivo",
    feedbackSideEffects: "Side Effects Observed",
    feedbackSideEffectsPlaceholder: "e.g. Mild hepatotoxicity at 10x dose",
    feedbackNotes: "Experimental Notes",
    feedbackSubmit: "Submit to Reinforcement Loop",
    feedbackSubmitted: "✓ Feedback Applied to Reinforcement Loop",
    researcherPlaceholder: "Dr. Kim",
    domainPlaceholder: "Marine Biochemistry",

    // Source badges
    sourceHybrid: "HYBRID",
    sourceMarine: "MARINE",
    sourceTerrestrial: "TERRESTRIAL",

    // Simulation complete log
    simComplete: (n: number) => `✓ Simulation complete — ${n} top candidates identified`,
  },

  ko: {
    // Header
    appTitle: "바이오 R&D 오케스트레이션",
    appSubtitle: "육상 × 해양 소재 융합 플랫폼",
    statDataSources: "데이터 소스",
    statTarget: "타겟 효능",
    statStatus: "상태",
    statusRunning: "실행 중",
    statusComplete: "완료",
    statusIdle: "대기",
    engineVersion: "AI 엔진 v2.4.1",

    // Upload Section
    uploadSectionTitle: "연구 데이터 업로드",
    uploadDrop: "JSON 파일을 드래그하거나 클릭하여 업로드",
    uploadHint: "물질 데이터 JSON 파일 (.json)",
    uploadLoaded: "데이터셋 로드 완료",
    uploadClear: "데이터 삭제",
    uploadTotal: "전체",
    uploadTerrestrial: "육상",
    uploadMarine: "해양",
    uploadErrorFormat: ".json 파일만 지원합니다.",
    uploadErrorParse: "JSON 파싱 실패. 파일 형식을 확인해주세요.",
    uploadUsingCustom: "업로드 데이터 사용 중",
    uploadUsingMock: "샘플 데이터 사용 중",

    // Left Panel
    panelSettings: "시뮬레이션 설정",
    sectionDataSources: "데이터 소스",
    srcTerrestrial: "육상 천연물",
    srcMarine: "해양 생리활성 물질",
    srcRegulatory: "규제 DB (식약처/FDA/EMA)",
    sectionPersona: "시뮬레이션 페르소나",
    targetEfficacyLabel: "타겟 효능",
    priorityWeights: "우선순위 가중치",
    priorityBioactivity: "생리활성",
    priorityStability: "안정성",
    prioritySynergy: "시너지 잠재력",
    priorityToxicity: "독성 한계치",
    sectionConstraints: "전문가 지식 제약조건",
    constraintsEmpty: "아직 추가된 제약조건이 없습니다.",
    constraintPlaceholder: "제약조건 규칙 입력...",
    constraintAdd: "제약조건 추가",
    constraintRemove: "삭제",

    // Efficacy options
    efficacyOptions: [
      "항염증",
      "항산화",
      "항균",
      "항종양",
      "신경보호",
      "면역조절",
      "항바이러스",
      "심장보호",
    ],

    // Constraints
    constraints: [
      "간독성 스캐폴드 제외",
      "분자량 < 700 Da (Lipinski 규칙)",
      "반응성 친전자체 제외",
      "GRAS 승인 전구체만 허용",
      "해양 유래 신규성 필수",
      "특허 공간 클리어런스 검토",
    ],

    // Center Panel
    engineTitle: "FUSION ALCHEMY ENGINE",
    engineSubtitle: "Terrestrial × Marine Convergence",
    iterationsLabel: "회 반복",
    logLabel: "시뮬레이션 로그",
    logAwaiting: "시뮬레이션 시작 대기 중...",
    btnStart: "시뮬레이션 시작",
    btnStop: "시뮬레이션 중지",
    layerMarine: "해양 레이어",
    layerTerrestrial: "육상 레이어",
    layerSynergy: "시너지",
    layerAdmet: "ADMET",
    badgeRunning: "실행 중",

    // Right Panel
    panelResults: "결과 및 분석",
    foundLabel: "개 발견",
    tabCandidates: "상위 10 후보",
    tabAnalysis: "상세 분석",
    noResults: "시뮬레이션을 실행하여 후보 물질을 발굴하세요",
    dockingLabel: "도킹",
    scoreLabel: "종합 점수",
    efficacyProfile: "효능 프로파일",
    admetProfile: "ADMET 프로파일",
    feedbackTitle: "Ph.D 피드백 루프",
    feedbackResearcher: "연구자 이름",
    feedbackDomain: "Ph.D 전공 분야",
    feedbackEfficacy: "관찰된 효능",
    feedbackStability: "생체 내 안정성",
    feedbackSideEffects: "관찰된 부작용",
    feedbackSideEffectsPlaceholder: "예: 10배 용량에서 경미한 간독성",
    feedbackNotes: "실험 노트",
    feedbackSubmit: "강화학습 루프에 제출",
    feedbackSubmitted: "✓ 피드백이 강화학습에 반영되었습니다",
    researcherPlaceholder: "김 박사",
    domainPlaceholder: "해양 생화학",

    // Source badges
    sourceHybrid: "하이브리드",
    sourceMarine: "해양",
    sourceTerrestrial: "육상",

    // Simulation complete log
    simComplete: (n: number) => `✓ 시뮬레이션 완료 — 상위 ${n}개 후보 물질 도출`,
  },
} as const;

export type Translations = (typeof t)[Lang];
