# AI Coding

**Vibe Coding > Agentic Engineering**

Les Outils · Les Notions · La Démo · Les Idées

## TLDR

- Utiliser #copilot + #opus en mode **YOLO**
- Laisser l'agent se tester et se corriger avec **agent-browser**
- PHASE 1: setup / plan / prompt / design API TS
- PHASE 2: test / review / refacto en permanence

## Les Outils

1. vscode + copilot + opus

```json vscode > settings.json
{
  "accessibility.signals.chatRequestSent": { "sound": "on" },
  "accessibility.signals.chatResponseReceived": { "sound": "on" },
  "accessibility.signals.chatUserActionRequired": { "sound": "on" },
  "accessibility.signalOptions.volume": 50,
  "chat.agent.maxRequests": 100, // x4 the default
  "chat.tools.global.autoApprove": true // YOLO mode
}
```

2. agent-browser

```bash
# Open a browser with remote debugging enabled
npm install -g agent-browser
agent-browser install
agent-browser open example.com
agent-browser dashboard install
agent-browser dashboard start
open http://localhost:4848/

# Connect to existing Brave Browser
osascript -e 'tell application "Brave Browser" to open location "brave://inspect/#remote-debugging"'
agent-browser open localhost
# Then accept remote debugging popup
```

3. v0 / cloud agents / pi

```bash
alias pi="pi -c"
alias cc="claude --continue --dangerously-skip-permissions || claude --dangerously-skip-permissions"
```

4. Pricing

| Service | Price       |
| ------- | ----------- |
| Copilot | 50€ / mois  |
| Claude  | 20€ / mois  |
| Vercel  | Free (5$)   |
| Cursor  | 20$ parfois |

## Les Notions #context #harness **#10k**

1. Glossaire

- model > gpt4, gemini, kimi, opus, etc
- context > tout ce qui est dans la session = messages (humain+ai) + skills + code + tools
- skill > une compétence spécifique ajoutée à l'agent (texte)
- tools > une fonctionnalité exposée à l'agent (inclut, API, CLI, MCP)
- mcp > proto de communication entre l'agent et un outil (API standard)
- harness > environnement complet pour l'agent (loop + tools + events)
- claw > remote control + personalité et mémoire (SOUL.md) + auto extension (self improvement)

2. Concepts

- autocomplete / chat / agent / claw / ?
- smart zone, <100k tokens <10k lignes dans le contexte
- caching, ne pas changer de modèle au milieu d'une session
- top model: Opus + Kimi(open/fast) sur [Vercel AI Gateway](https://vercel.com/ai-gateway/models?providers=anthropic,moonshotai&sortField=releaseDate)
- les API doit être simple, claire, isolé, les implems des functions peuvent être regénérées

3. Les phases

- PHASE 1: plan / prompt > demander un fix/feature des tests + refacto + re-tests
- PHASE 2: test / review > à faire manuellement et bien, et redemander ré-écriture, ré-organisation ciblée pour la compréhension humaine

## La Démo

1. vibe coding - projet blank.md

- 1 shot, 15min
- chaque feature est une pain
- à ré-écrire complètement régulièrement pour setup un projet propre

2. agentic engineering - projet past.app

- long à setup
- laisser l'agent se tester
- améliorer le tooling tout le long
- revérifier et redemander d'améliorer en permanence

## Les Idées

- ⚠️ AI a pas de mémoire
- ⚠️ AI dégrade le code ultra-vite
- ⚠️ AI coûte cher malgré subvention des boîtes US
- ⚠️ AI bullshit, partir du principe que c'est faux, et faire des tests/benchmarks/vérifications des sources
- ⚠️ YOLO évidement pas recommandé niveau sécurité

- avoir des bots / scripts > auto analyze + fix, auto recap
- coder en remote / sandbox
- coder sur le tel (claw, dispatch, ssh)
- coder en multi-agent (opus + gpt + gemini + kimi)
- coder en parallèle
- coder en boucle, 24/7, autoresearch ou ralph
- opus fast

# By @vbrajon

À suivre Anthropic/Cursor Blog, @karpathy, @badlogicgames, @VictorTaelin
