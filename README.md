# SignCoach

Accessible ASL practice prototype (Wizard-of-Oz). Participants watch a reference, practice with a live webcam, and receive **component-level** feedback on handshape, hand position, movement, and palm orientation.

Webcam frames and MediaPipe landmarks are processed **locally in the browser**. Video is not recorded or uploaded.

> MediaPipe is used only for **camera tracking guidance** (hand/face visibility). It does **not** determine whether an ASL sign is correct. ASL performance feedback is provided by a human Wizard through `/wizard`.

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Participant + Wizard (same computer)

1. Participant tab: normal SignCoach UI (`/`)  
2. Researcher tab: open `/wizard`  
3. Participant selects a sign → Start Camera → Start Attempt → Finish Attempt  
4. Participant sees **Checking your sign...**  
5. Wizard selects feedback → **Send Feedback**  
6. Participant automatically sees **Your Feedback**  
7. **Try Again** starts a clean new attempt

Communication uses `BroadcastChannel('signcoach-wizard')` with a `localStorage` fallback.

## Supported signs

| Sign | YouTube reference |
|------|-------------------|
| **Nice to Meet You** | `1UpLG1Hyk3U` |
| **Thank You** | `qlWPnATjNx0` |
| **Yesterday** | `ZgFKM8DT4zQ` |
| **Walk** | `52wgLQGkbCA` |

Sign definitions: [`src/data/signs.js`](src/data/signs.js).  
Wizard message presets: [`src/data/wizardFeedbackOptions.js`](src/data/wizardFeedbackOptions.js).

## Privacy

- `getUserMedia` video stays in the page  
- No default recording, saving, or uploading of webcam footage  
- Practice notice: “Your camera is used for practice and your video is not recorded or uploaded.”

## Accessibility

Keyboard-accessible controls, skip link, semantic landmarks, visible focus, high-contrast educational palette, status text (not color alone), caption placeholders for videos, and clear camera permission / tracking error messages.
