import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64'
);

async function createPlayer(browser, nickname, label) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.webSocketFrameReceived', event => {
    try {
      const msg = JSON.parse(event.response.payloadData);
      if (msg.type === 'STATE') {
        fs.appendFileSync('browser.log', `[CDP ${label}] phase=${msg.state?.phase} round=${msg.state?.round} submitted=${JSON.stringify(msg.state?.submissionStatus)}\\n`);
      }
    } catch {}
  });
  await page.goto('/');
  await page.locator('input[placeholder="Nickname"]').fill(nickname);
  const avatar = label === 'P1' ? '5' : '12';
  await page.getByRole('button', { name: `Character ${avatar}` }).click();
  await expect(page.locator('.avatars button')).toHaveCount(20);
  await expect(page.locator('.profileNameRow .profileAvatar')).toHaveAttribute('data-avatar', avatar);
  const selectedAvatar = page.locator('.avatars button.selected');
  await expect(selectedAvatar).toHaveAttribute('data-avatar', avatar);
  await expect(selectedAvatar).toHaveCSS('background-color', 'rgb(97, 223, 154)');
  await expect(selectedAvatar).toHaveCSS('padding', '0px');
  await expect(selectedAvatar.locator('.avatarIcon')).toHaveCSS('object-fit', 'cover');
  return { context, page };
}

async function addTwoImages(page) {
  await page.locator('#file').setInputFiles([
    { name: 'image-1.png', mimeType: 'image/png', buffer: ONE_PIXEL_PNG },
    { name: 'image-2.png', mimeType: 'image/png', buffer: ONE_PIXEL_PNG },
  ]);
  await expect(page.locator('.poolGrid .poolCard')).toHaveCount(2);
  await page.getByRole('button', { name: /^Ready!/ }).click();
}

test('two players can submit Round 1 and both reach Round 2', async ({ browser }) => {
  const player1 = await createPlayer(browser, 'Player 1', 'P1');
  const player2 = await createPlayer(browser, 'Player 2', 'P2');

  try {
    const p1 = player1.page;
    const p2 = player2.page;

    fs.writeFileSync('browser.log', '');
    for (const [label, page] of [['P1', p1], ['P2', p2]]) {
      page.on('websocket', ws => {
        ws.on('framereceived', data => {
          try {
            const msg = JSON.parse(String(data));
            if (msg.type === 'STATE') console.log(`[WS ${label}] phase=${msg.state?.phase} round=${msg.state?.round} submitted=${JSON.stringify(msg.state?.submissionStatus)}`);
          } catch {}
        });
      });
    }

    await p1.getByRole('button', { name: /Host Game/ }).click();
    await p1.getByRole('button', { name: /Create Lobby/ }).click();

    await expect(p1.locator('.code')).toBeVisible();
    const lobbyCode = await p1.locator('.code').innerText();

    await p2.getByRole('button', { name: /Join Game/ }).click();
    await p2.locator('#joinCode').fill(lobbyCode);
    await p2.getByRole('button', { name: /Join Lobby/ }).click();

    await expect(p1.locator('.players')).toContainText('Player 2');
    await expect(p2.locator('.players')).toContainText('Player 1');
    await expect(p1.locator('.playerAvatar[data-avatar="5"]')).toHaveCount(1);
    await expect(p1.locator('.playerAvatar[data-avatar="12"]')).toHaveCount(1);
    await expect(p1.locator('.playerAvatar[data-avatar="5"]')).toHaveCSS('width', '52px');
    await expect(p1.locator('.playerAvatar[data-avatar="5"]')).toHaveCSS('height', '52px');
    await expect(p1.locator('.playerAvatar[data-avatar="5"]')).toHaveCSS('border-radius', '50%');
    await expect(p1.locator('.playerHud .hudAvatar[data-avatar="5"]')).toHaveCSS('width', '52px');
    await expect(p1.locator('.playerHud .hudAvatar[data-avatar="5"]')).toHaveCSS('height', '52px');
    await expect(p1.locator('.playerHud .hudAvatar[data-avatar="5"]')).toHaveCSS('border-radius', '50%');
    await expect(p1.locator('.playerHud .hudAvatar[data-avatar="5"]')).toHaveCount(1);

    await p2.getByRole('button', { name: /Ready up/ }).click();
    await expect(p1.getByRole('button', { name: /Start Game/ })).toBeEnabled();
    await p1.getByRole('button', { name: /Start Game/ }).click();

    await expect(p1.getByText('Build your image pool')).toBeVisible();
    await expect(p2.getByText('Build your image pool')).toBeVisible();

    await addTwoImages(p1);
    await addTwoImages(p2);

    await expect(p1.getByText(/Give everyone something ridiculous to make/)).toBeVisible();
    await expect(p2.getByText(/Give everyone something ridiculous to make/)).toBeVisible();

    await p1.locator('#prompt').fill('A tiny dinosaur running a karting track');
    await p2.locator('#prompt').fill('A penguin who thinks it is a racing driver');
    await p1.getByRole('button', { name: /Submit Prompt/ }).click();
    await p2.getByRole('button', { name: /Submit Prompt/ }).click();

    await expect(p1.getByText('ROUND 1 OF 2')).toBeVisible();
    await expect(p2.getByText('ROUND 1 OF 2')).toBeVisible();

    const submit1 = p1.getByRole('button', { name: /Submit collage/ });
    const submit2 = p2.getByRole('button', { name: /Submit collage/ });

    await expect(submit1).toBeEnabled();
    await expect(submit2).toBeEnabled();

    await submit1.click();
    await submit2.click();

    await expect(p1.getByText('ROUND 2 OF 2')).toBeVisible({ timeout: 5_000 });
    await expect(p2.getByText('ROUND 2 OF 2')).toBeVisible({ timeout: 5_000 });

    await p1.getByRole('button', { name: /Submit collage/ }).click();
    await p2.getByRole('button', { name: /Submit collage/ }).click();

    await expect(p1.getByText('FINAL PROMPT')).toBeVisible({ timeout: 5_000 });
    await expect(p2.getByText('FINAL PROMPT')).toBeVisible({ timeout: 5_000 });
    await expect(p1.getByRole('button', { name: 'Vote for this' })).toHaveCount(1);
    await expect(p2.getByRole('button', { name: 'Vote for this' })).toHaveCount(1);

    await p1.getByRole('button', { name: 'Vote for this' }).click();
    await p2.getByRole('button', { name: 'Vote for this' }).click();

    await expect(p1.getByText('FINAL SHOWCASE • 2 OF 2')).toBeVisible({ timeout: 5_000 });
    await expect(p2.getByText('FINAL SHOWCASE • 2 OF 2')).toBeVisible({ timeout: 5_000 });

    await p1.getByRole('button', { name: 'Vote for this' }).click();
    await p2.getByRole('button', { name: 'Vote for this' }).click();

    await expect(p1.getByText('FINAL RESULTS')).toBeVisible({ timeout: 5_000 });
    await expect(p2.getByText('FINAL RESULTS')).toBeVisible({ timeout: 5_000 });

    p1.on('dialog', dialog => dialog.accept());
    await p1.getByRole('button', { name: '↩ Leave Game' }).click();
    await expect(p1.getByText('SHUFFLE • COLLAGE')).toBeVisible({ timeout: 5_000 });
    await expect(p1.getByRole('button', { name: '🎮 Host Game' })).toBeVisible();
  } finally {
    await player1.context.close();
    await player2.context.close();
  }
});
