## AlgoTeen

AlgoTeen is a Next.js learning platform that teaches teens how to trade safely. The site mixes trading fundamentals, programming roadmaps, and practice projects. Static content lives in the App Router, styling is handled with Tailwind utilities, and interactive diagrams use `react-xarrows`.

## Features

- Landing page with hero, strategy tracks, and pricing sections
- Learn page that includes the trading and programming roadmap diagram
- Interactive node details with searchable resources and project ideas
- Header search that jumps to any page section and the AlgoTeen wordmark routing home

## Screenshots

![Roadmap overview](./public/roadmap2.png)
_Roadmap title area with the trading module nodes._

![Programming modules](./public/roadmap.png)
_Programming roadmap section highlighting the automation modules._

![Build Code panel](./public/build%20code.png)
_Landing page slice that introduces the Build Code workspace._

## Tech Stack

- Next.js App Router
- React 19
- Tailwind CSS utility classes (`src/app/globals.css`)
- react-xarrows for the roadmap connectors
- Google Fonts via `next/font`
- Custom Fonts in /fonts

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open http://localhost:3000 to view the app. The Learn roadmap is available at http://localhost:3000/learn.

## Project Structure

```
src/
	app/
		layout.js      # Root layout and font wiring
		page.js        # Landing page content
		learn/page.js  # Learn roadmap screen
	components/
		RoadmapDiagram.js  # Trading and programming roadmap
		SiteHeader.js      # Shared header with search dropdown
		SiteFooter.js      # Shared footer
	data/
		searchIndex.js     # Search entries used by the header
```

Global styles, color variables, and Tailwind utilities are defined in `src/app/globals.css`.

## License

MIT License. See `LICENSE` for the full text.
