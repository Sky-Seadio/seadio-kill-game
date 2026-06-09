#!/bin/bash
# Generate all Seadio Kill character cards using Open Design

OPEN_DESIGN="D:/Open Design"
PROJECT="seadio-kill-cards-f79a"
OUTPUT_DIR="e:/Ai/Seadio Kill/client/assets/cards"

# Character prompts
declare -A PROMPTS
PROMPTS[hunter]="Create a dark fantasy hunter character card art. The hunter should be a skilled monster hunter with a crossbow, leather armor with silver accents, dark forest setting with moonlight filtering through trees, determined expression, ready for battle. Style: digital painting, dramatic lighting, Hearthstone card game quality. Size: 300x420 pixels, portrait orientation."
PROMPTS[guardian]="Create a dark fantasy guardian knight character card art. The guardian should be an armored knight with a magical shield, heavy plate armor with blue glowing runes, protective stance, blue energy shield, castle background, dramatic lighting. Style: digital painting, Hearthstone card game quality. Size: 300x420 pixels, portrait orientation."
PROMPTS[witch]="Create a dark fantasy witch character card art. The witch should be a mysterious woman brewing a potion, flowing dark robes, purple magical aura, cauldron with glowing brew, mystical symbols, moonlit tower room, atmospheric. Style: digital painting, Hearthstone card game quality. Size: 300x420 pixels, portrait orientation."
PROMPTS[seer]="Create a dark fantasy seer character card art. The seer should be a wise figure gazing into a crystal ball, flowing cosmic robes, glowing eyes, starry divination, mystical energy, observatory setting, ethereal lighting. Style: digital painting, Hearthstone card game quality. Size: 300x420 pixels, portrait orientation."
PROMPTS[villager]="Create a dark fantasy villager character card art. The villager should be a simple folk person carrying a torch, hooded cloak, worried but determined expression, village ruins in background, dramatic torch lighting. Style: digital painting, Hearthstone card game quality. Size: 300x420 pixels, portrait orientation."

# Generate each card
for character in hunter guardian witch seer villager; do
  echo "Generating $character card..."
  
  # Start run
  RUN_ID=$(cd "$OPEN_DESIGN" && (echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"start_run\",\"arguments\":{\"project\":\"$PROJECT\",\"prompt\":\"${PROMPTS[$character]}\"}}}"; sleep 30) | node "resources/app/prebundled/daemon/daemon-cli.mjs" mcp --daemon-url http://127.0.0.1:7456 2>&1 | grep -o '"runId":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  echo "  Run ID: $RUN_ID"
  
  # Wait for completion (poll every 30 seconds)
  while true; do
    sleep 30
    STATUS=$(cd "$OPEN_DESIGN" && (echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_run\",\"arguments\":{\"runId\":\"$RUN_ID\"}}}"; sleep 5) | node "resources/app/prebundled/daemon/daemon-cli.mjs" mcp --daemon-url http://127.0.0.1:7456 2>&1 | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    echo "  Status: $STATUS"
    
    if [ "$STATUS" = "succeeded" ]; then
      # Save the artifact
      cd "$OPEN_DESIGN" && (echo "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_artifact\",\"arguments\":{\"project\":\"$PROJECT\",\"entry\":\"index.html\"}}}"; sleep 10) | node "resources/app/prebundled/daemon/daemon-cli.mjs" mcp --daemon-url http://127.0.0.1:7456 2>&1 | node -e "
const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  const data = JSON.parse(chunks.join(''));
  const content = data.result.content[0].text;
  const parsed = JSON.parse(content);
  const html = parsed.files[0].content;
  require('fs').writeFileSync('$OUTPUT_DIR/$character.html', html);
  console.log('  Saved $character.html');
});
"
      break
    elif [ "$STATUS" = "failed" ]; then
      echo "  Failed!"
      break
    fi
  done
done

echo "All cards generated!"
