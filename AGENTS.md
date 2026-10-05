# Project Architecture Rules

- Render assistant Markdown directly through the shared Streamdown message renderer so structured reports display as headings and paragraphs while stored responses remain portable plain text.
- Keep the chat transcript and opaque composer as separate flex rows in a visual-viewport-sized workspace so typing and mobile keyboards cannot overlay replies.