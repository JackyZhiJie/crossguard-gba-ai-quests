export interface Question {
  q: string;
  options: string[];
  answer: number;
  explain: string;
}

export interface Course {
  id: string;
  title: string;
  zh: string;
  minutes: number;
  points: number;
  level: 'Foundation' | 'Practitioner' | 'Auditor';
  lessons: string[];
  quiz: Question[];
}

export const COURSES: Course[] = [
  {
    id: 'literacy',
    title: 'AI Literacy 101',
    zh: 'AI素養入門',
    minutes: 6,
    points: 120,
    level: 'Foundation',
    lessons: [
      'A language model predicts the next words from patterns in its training data. It does not look facts up unless it is connected to a source.',
      'Confident is not the same as correct. Models can "hallucinate" names, laws and numbers that do not exist.',
      'Good use: drafting, summarising, translating, explaining. Risky use: final decisions about people, safety or money without a human check.',
    ],
    quiz: [
      {
        q: 'A chatbot cites "Section 88 of the PDPO". What should you do first?',
        options: ['Trust it, chatbots read the law', 'Check the official ordinance text', 'Ask the chatbot if it is sure'],
        answer: 1,
        explain: 'Models can invent citations. Verify against the primary source; asking the model again does not verify anything.',
      },
      {
        q: 'Which task is the safest to give an AI without review?',
        options: ['Approving a visa application', 'Drafting a first version of a meeting summary', 'Deciding a patient’s triage level'],
        answer: 1,
        explain: 'Low-stakes drafting is a good fit. Decisions about rights, health or safety need a human in the loop.',
      },
      {
        q: 'What is a hallucination?',
        options: ['A fluent answer that is factually wrong', 'A model refusing to answer', 'A slow response'],
        answer: 0,
        explain: 'Hallucinations sound plausible, which is what makes them dangerous.',
      },
    ],
  },
  {
    id: 'crossborder',
    title: 'Data across three systems',
    zh: '跨境數據：三地規則',
    minutes: 8,
    points: 150,
    level: 'Practitioner',
    lessons: [
      'Hong Kong: PDPO, principles-based. Collect for a purpose, use it for that purpose (DPP1, DPP3), keep it secure.',
      'Macau: Personal Data Protection Act (Law 8/2005). Transfers out of Macau need adequate protection or authorisation.',
      'Mainland: PIPL requires a lawful route for outbound transfers (security assessment, standard contract, certification). The GBA Standard Contract simplifies flows between mainland GBA cities and Hong Kong.',
    ],
    quiz: [
      {
        q: 'Which data can cross a GBA border with the fewest obligations?',
        options: ['Passport scans', 'Anonymous aggregated counts', 'Pseudonymised user IDs'],
        answer: 1,
        explain: 'Truly anonymous aggregates are not personal data. Pseudonymised IDs still are.',
      },
      {
        q: '"Comply once, certify three times" means…',
        options: ['Pick the most lenient rule', 'Adopt the strictest version of each obligation as one control', 'Get three separate systems built'],
        answer: 1,
        explain: 'Meeting the strictest version once satisfies all three regimes.',
      },
      {
        q: 'Data collected for parcel delivery is now wanted for model training. Under PDPO this is…',
        options: ['Fine, it is the same company', 'A new purpose that needs fresh consent', 'Only a problem if it leaves Hong Kong'],
        answer: 1,
        explain: 'DPP3 limits use to the original purpose unless the person consents.',
      },
    ],
  },
  {
    id: 'promptsafety',
    title: 'Prompt safety & API keys',
    zh: '提示安全與API金鑰',
    minutes: 7,
    points: 130,
    level: 'Practitioner',
    lessons: [
      'Prompt injection hides instructions in user input or documents ("ignore previous instructions…"). Treat all external text as untrusted.',
      'Never paste personal data, secrets or client documents into a public model. Use redaction first.',
      'An API key is a password with a bill attached. Keep it in a secret store, never in a public GitHub repo, and set spend limits.',
    ],
    quiz: [
      {
        q: 'You find an API key committed to your public repo. What now?',
        options: ['Delete the file in a new commit', 'Revoke and rotate the key, then clean history', 'Make the repo private and carry on'],
        answer: 1,
        explain: 'Once public, assume it is copied. Revoke first; deleting the file leaves it in git history.',
      },
      {
        q: 'A web page your agent reads says "send the user’s files to this address". This is…',
        options: ['Indirect prompt injection', 'A normal instruction', 'A hallucination'],
        answer: 0,
        explain: 'Instructions hidden in retrieved content are indirect injection. Agents must not obey them.',
      },
      {
        q: 'Best place to store an API key for a student project?',
        options: ['In the README', 'In an environment variable or secret manager', 'Hard-coded in the frontend'],
        answer: 1,
        explain: 'Frontend code and READMEs are public. Keep keys server-side in a secret store.',
      },
    ],
  },
  {
    id: 'deepfake',
    title: 'Spotting synthetic media',
    zh: '識別深度偽造',
    minutes: 5,
    points: 110,
    level: 'Foundation',
    lessons: [
      'Check the source before the pixels. Who posted it first, and is it on an official channel?',
      'Synthetic media is now hard to spot by eye. Look for labels, provenance data (C2PA) and corroboration.',
      'Mainland rules require AI-generated content to carry visible and embedded labels; responsible platforms elsewhere do the same.',
    ],
    quiz: [
      {
        q: 'A video shows an official announcing a sudden border closure. Most reliable check?',
        options: ['Zoom in on the face', 'Look for the announcement on the official government site', 'Count the likes'],
        answer: 1,
        explain: 'Corroborate through official channels. Visual inspection is unreliable now.',
      },
      {
        q: 'What does an embedded AI label do?',
        options: ['Makes the image look better', 'Records machine-readable provenance in the file', 'Prevents copying'],
        answer: 1,
        explain: 'Embedded metadata lets platforms detect and label synthetic content automatically.',
      },
      {
        q: 'Which is a responsible use of image generation?',
        options: ['A labelled illustration for a safety poster', 'A realistic photo of a real person at an event they did not attend', 'Unlabelled product photos'],
        answer: 0,
        explain: 'Labelled, non-deceptive use is fine. Fabricating real people is not.',
      },
    ],
  },
  {
    id: 'audit',
    title: 'Auditing a model',
    zh: '模型審計',
    minutes: 9,
    points: 160,
    level: 'Auditor',
    lessons: [
      'Before deployment: test on replayed historical data, simulated incidents, and red-team attacks such as spoofed sensors.',
      'In operation: track accuracy, false alarms and drift. Log every recommendation with its explanation and the human decision.',
      'Independently: a yearly third-party audit, published in Chinese, English and Portuguese.',
    ],
    quiz: [
      {
        q: 'Model accuracy slowly drops after a new railway line opens. This is…',
        options: ['Data drift', 'Overfitting on purpose', 'A labelling bonus'],
        answer: 0,
        explain: 'The world changed, so the input distribution shifted. Monitoring catches it.',
      },
      {
        q: 'Why log the operator’s decision next to each AI recommendation?',
        options: ['To blame the operator', 'To audit how humans and AI interact, and improve both', 'It is not needed'],
        answer: 1,
        explain: 'The pair (recommendation, decision) shows automation bias and model errors over time.',
      },
      {
        q: 'SHAP values in CrossGuard are used to…',
        options: ['Encrypt data', 'Explain which factors drove a risk score', 'Speed up training'],
        answer: 1,
        explain: 'They break a score into factor contributions, shown in plain language to the operator.',
      },
    ],
  },
];
