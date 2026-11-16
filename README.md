# SignCoach

Accessible ASL practice prototype (Wizard-of-Oz). Participants watch a reference, practice with a live webcam, and receive **component-level** feedback on handshape, hand position, movement, and palm orientation.

MediaPipe provides local camera guidance. A human operator replays the submitted sign and chooses the ASL feedback in a separate browser tab.

## Quick start

```bash
npm install
npm run dev
```

Use Node.js 22.12+ and a current browser such as Chrome or Edge. Open the local URL shown in the terminal (typically `http://localhost:5173`). The command starts the web app and its review API together.

### Participant and operator tabs

1. Open the SignCoach home page in the participant tab.
2. Open the **Private Wizard URL** printed in the terminal on the operator’s display. A new link is generated on each server start.
3. In the participant tab, select a sign, then choose **Start Camera**, **Start Attempt**, and **Finish Attempt**.
4. In the operator tab, replay the clip, choose feedback for each component, and click **Send Feedback**.
5. The participant tab opens **Your Feedback** automatically. **Try Again** starts a fresh attempt.

The server supports one pending attempt at a time. For a built version, run `npm run build` and then `npm run preview` to serve the app and its review API. If using a separate participant device, serve the app over HTTPS so the browser can access its webcam.

### Remote participant session

On Windows, install [cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/) once with `winget install --id Cloudflare.cloudflared -e`, then reopen PowerShell. From the SignCoach folder, run:

```powershell
npm run study
```

Share the **Participant URL to share** with one participant at a time. Open the **Private Wizard URL** on your own computer. Both URLs use the same review server. Keep the terminal running throughout the session and press Ctrl+C when finished. Anyone with the temporary participant URL can open it.

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

- The camera preview stays in the browser. **Start Attempt** captures silent video. **Finish Attempt** submits it to the review server, and attempts submit automatically at the 30-second limit.
- The server holds the clip in memory until feedback is sent, the attempt is cancelled, or 10 minutes elapse. The operator link is required to retrieve the clip.

## Accessibility

Keyboard-accessible controls, skip link, semantic landmarks, visible focus, high-contrast educational palette, status text (not color alone), caption placeholders for videos, and clear camera permission / tracking error messages.
