# PetrolScan Crawler

This is a project for my Bachelor Thesis assignment, which is a web app for petrol station fuel prices
comparison. I've greatly overestimated how huge project this really is, but whatever, I'm going to deliver,
even if I'll have to do some cuts in order to make it into the deadline.

This particular repository is the crawler that crawls selected list of petrol station websites, and scrapes
fuel price data off them. No permission was given, some of them may have an official API, which may be paid,
but I can't afford to pay for an API access, so scraping it is. It may be frowned upon, but it's not illegal
per say to use scraped data for a simple comparison, especially if there's no profit in running the app.

## Update 2026-02-06

I've finally fixed the crawlers. Most notably Globus has completely stopped working due to recent website
overhaul, which meant rewriting a substantial portion of the scraping logic to accomodate for the new design.
Furthermore, I've decided to go ahead and fix an issue with null coordinates for some locations that couldn't
be found via OpenStreetMap Nomimatim API.

The list of changes made for this update is as follows:

- d87b2c6 Node Packages Update
- c205fd2 Minor logging tweaks + Added date directory for error screenshots + Optimized message logging format to use a variable
- 065d5af Trimming the ISO date&time to just the date part
- fc3691f Fixed new TSconfig error - missing "rootDir" directive
- 07e1a63 Dev mode: command line argument to start a specific crawler + [arg 1]: crawler to start   (globus|ono|all) => default: 'all'   case insensitive
- b176229 Dev command line arguments + [arg 0]: crawler to start   (globus|ono|all), case insensitive   default = all + [arg 1-n]: debug mode   if present, makes database dump at the end
- 5710cc6 Updates and vulnerability fixes
- f0f462b Further updates and vulnerability fixes (including a severe one)
- b9ab5c4 Crawler fixed using Claude Opus. - Implemented new logic for a new website design - Fixed issues with timeouts and screenshots
- cbfeea2 Fixed database logging for both crawlers with Claude Opus: + Fixed the robustness of OpenStreetMap API search + Added logic for search term adjustment for both Globus and ONO + Adjusted Dockerfile for underlying image changes
- d6a46a2 Fixed Docker image bug - Unwanted pollution by an old test build   Fixed by adding the `dist/` directory into the `.dockerignore` file.

## Enabled crawlers

The following petrol stations are currently enabled:

- **Globus:** [https://www.globus.cz/](https://www.globus.cz/) —
  Each hypermarket has one petrol station. There are only 16 hypermarkets in the Czech Republic.
- **ONO:** [https://www.tank-ono.cz/](https://www.tank-ono.cz/) —
  This network of petrol stations has 45 petrol stations all over the Czech Republic.

## Disabled crawlers

While analyzing websites of petrol stations, I decided to disable following crawlers:

- **Orlen:** This website doesn't seem to include any kind of fuel price data. Only information about
  provided services and discounts for using a fuel card is included. Therefore this petrol station
  was discarded from this project. Data for its processing are included.
- **Shell:** This website doesn't seem to include any kind of fuel price data. Therefore this petrol
  station was discarded from this project. Data for its processing are included.
- **EuroOil:** This website doesn't seem to include any kind of fuel price data. Therefore this petrol
  station was discarded from this project. Data for its processing are included.
- **MOL:** This website doesn't seem to include any kind of fuel price data. Therefore this petrol
  station was discarded from this project. Data for its processing are included.
- **OMV:** This website decided to troll crawlers and scrapers by embedding all fuel price data
  into a single generated PNG image, which would require me to build or find an OCR, which there is
  no time for doing that. Therefore this petrol station was discarded from this project.
  Data for its processing are included.
- **Prim:** This website doesn't seem to include any kind of fuel price data. Therefore this petrol
  station was discarded from this project. Data for its processing are not included, since there's
  nothing to process. Yes, the petrol stations listed do include information about provided services,
  including fuel pumps (not every station includes every type and quality of fuel), but not their
  prices. Not to mention that this website doesn't support HTTPS, which is a huge red flag nowadays.
- **Makro:** This website implements advanced anti-scraping mechanisms that block any automated crawling
  once it catches on. That thwarts any attempt to extract fuel prices information from the websites.

### What happens with disabled crawlers then?

For the needs of Bachelor Thesis, these crawlers have been removed from the functional prototype.
I am however planning to use this Bachelor Thesis project further for my own personal project,
so I'm keeping the data in for that, meaning I can then install additional modules when time isn't
my enemy. These additional changes however are not going to be part of the original project,
I'm going to fork the archive of this project to build upon it.

## GitHub Copilot?

Yes, I have used GitHub Copilot to generate the base skeleton for the Globus crawler, based on my input
of the detailed actions needed to do to get access to each location's fuel data and the CSS selectors
needed to find specific elements on the website page. It was quicker than reading detailed documentation,
and I still needed to tweak stuff around, because generated code contained deprecated methods and didn't
work straight away. It required a lot of interaction with he GitHub Copilot prompt as well as manually
tweaking stuff based on the documentation to get it working. Since Globus changed slightly how certain
features on their website works, I had to rewrite a portion of the crawler logic to accomodate for that
change. Vibe Coding isn't just "generate the code and let it be". It requires a lot of input and interaction
and to properly test the code. Despite requiring a lot of input, it still made it possible to finish
the project quicker than with manual coding while looking into documentation. It at least left the room
for tweaks and cosmetic touch ups.
