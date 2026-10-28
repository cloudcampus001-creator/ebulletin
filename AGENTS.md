<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Use pure JavaScript PBKDF2 for teacher passwords, preserving the stored hash format; native Worker PBKDF2 rejects the existing iteration count.
- Keep teacher session checks, active-account checks, and assignment/roster validation server-side; QR access must not grant access outside the assigned class.
