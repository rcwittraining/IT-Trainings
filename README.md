# RCW IT Training site package

This folder is ready to publish from the root of the GitHub Pages repository for `www.rcwittraining.in`.

## Files

- `index.html` — public lab page
- `open.html` — same-domain simulator launcher
- `simulators.json` — simulator data and GitHub Pages targets
- `admin/index.html` — unlisted simulator editor at `/admin/`
- `CNAME` — GitHub Pages custom-domain setting
- `.nojekyll` — tells GitHub Pages to publish these files directly

## Publish the site

1. Upload **all files and folders** in this package to the root of the website repository.
2. In the repository, open **Settings → Pages**.
3. Select the publishing branch (normally `main`) and the repository root.
4. Configure the custom domain as `www.rcwittraining.in` and enable HTTPS.
5. Confirm that the public page opens at `https://www.rcwittraining.in/`.
6. Open the unlisted editor at `https://www.rcwittraining.in/admin/`.

The public page contains no link to `/admin/`, and the admin page has `noindex`/`nofollow` metadata.

## Create the restricted publishing credential

GitHub Pages cannot authenticate a private URL. The admin page therefore requires a GitHub **fine-grained personal access token** before it can read or change the simulator list.

Create the token at:

`https://github.com/settings/personal-access-tokens/new`

Use these restrictions:

- **Repository access:** Only select repositories → choose the website repository
- **Repository permission:** Contents → Read and write
- Do not grant other permissions
- Set a reasonable expiration date

The token is held only in browser memory. It is not saved to local storage, HTML, or `simulators.json`. The GitHub owner, repository and branch fields are saved locally for convenience, but the token must be entered again after refreshing or closing the page.

## Use the admin page

1. Visit `https://www.rcwittraining.in/admin/`.
2. Enter the GitHub owner/username, website repository, publishing branch and fine-grained token.
3. Select **Connect and load simulators**.
4. Add, edit, delete or reorder simulator cards.
5. For each card, enter:
   - a short public launcher ID, such as `gcp-admin`
   - its GitHub Pages target, such as `https://rcwittraining.github.io/GCP-Admin-Exam-Simulator/`
6. Select **Publish changes**.

The admin commits only `simulators.json`. The public card opens a URL such as `https://www.rcwittraining.in/open.html?lab=gcp-admin`; `open.html` loads the simulator inside a full-page frame. The GitHub address is therefore not displayed on the card or in the browser address bar. The public page automatically updates its cards, search results and lab count. GitHub Pages can take a minute or two to publish a new commit.

## Security limitation

With GitHub Pages only, `/admin/` cannot be made invisible or protected before it loads. Anyone who guesses the URL can see the sign-in form. However, they cannot publish changes without a GitHub credential that has write permission to the repository.

The simulator's GitHub Pages URL is hidden from normal page display and from the address bar. It is not cryptographically secret: a technical user can still discover an iframe destination with browser developer tools. Completely concealing it would require a reverse proxy or authenticated backend.

For true email/password protection of the URL itself, a service such as Cloudflare Access or an authenticated server would be required later.
