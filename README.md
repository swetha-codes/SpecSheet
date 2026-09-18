# SpecSheet

A tool that turns dense component datasheets into clean, structured summaries: voltage range, current rating, package type, operating temperature, absolute max ratings, pinout, key features, and warnings, pulled out and organized so you can actually scan them.

## Why I built this

During my embedded HW/SW internship, I spent a lot of time digging through component datasheets to review and select parts, and a lot of that time went into just finding the numbers I actually needed, buried across dozens of pages of formatting that varies wildly between manufacturers. I got the idea to build SpecSheet to fix that: upload a datasheet, get the key specs back in a consistent, readable format instead of re-reading the same PDF structure every time.

## What it does

- Upload a PDF datasheet (or paste a link) and get an AI-generated summary broken into spec categories
- Results are shown as scannable cards, not a wall of text
- Keeps a history of previously summarized datasheets, organized by tag/project
- Search past uploads by component name or tag

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
- Supabase (auth + storage)

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone https://github.com/swetha-codes/SpecSheet.git
cd SpecSheet
npm i
npm run dev
```
