
# Setup Wisen Space Core Project

## Download and Install

1. If on mac, Homebrew, is a great package manager that makes it easy to install the tools we need
https://brew.sh/

2. Node JS:
mac (via terminal):  brew install node   
win: https://nodejs.org/en/

3. MongoDB:
mac:(via terminal):   brew install mongodb  or https://docs.mongodb.com/manual/tutorial/install-mongodb-on-os-x/ 
pc: https://docs.mongodb.com/manual/tutorial/install-mongodb-on-windows/
If possible run this as a service so that the DB is always up

4. Code Editors. I have used the following and I like sublime the most. But feel free to find one you like:
Microsoft Code: https://code.visualstudio.com/
Sublime Text: http://www.sublimetext.com/ 
Atom: https://atom.io/
These editors all work on any OS.

5. MongoDB Data Explorer:
robo3t: https://robomongo.org/ (Choose Robo3T)


## Clone repository from Github
- Create a GitHub account
- Ask admin (Jared) to allow access to github repo: https://github.com/wisenspace/core
- In terminal type this command: `git clone https://github.com/wisenspace/core.git`
- Now you have copied all the sourcecode

## Configuration file for DB

- In the /core directory, create a file config.json
- The content of the json file shouldn't be published here. Ask other people about it.
 

## Install libraries for node

- `npm install` will do it all

## Setup localhost

- Add a line to /etc/hosts (ex. `sudo nano /etc/hosts`)
```127.0.0.1       localhost YOUR_NAME```

## That should be it. Now let's test.

- (terminal) node api/api.js 8081
- (browser) YOUR_NAME:8081/admin/home


## Git Commands (Should run these all in the directory of core)
- Create a branch: `git checkout -b 'NAME OF BRANCH'`
- Add files: `git add -A`
- See files you changes: `git diff`
- See status: `git status`
- Commit files: `git commit -m 'updated something'`
- Push to github: `git push`
- Push new branch to github: `git push --set-upstream orgin 'NAME OF BRANCH'`
- Checkout master branch: `git checkout master`
- Pulling data from github: `git pull`

## Development Rules

### Syntax
 - Indent with Tabs
 - List out variables with commas
 - Put requires in a `const` block at top of page
 - Put global `const` block before global `let` block
 - Exports should be as an object

### Server Side Templating
 - Main Template page should be the only page with the following tags: `html, head, body, style, script, meta, header, main, footer, and section`. These tags are used to control the overall template layout as defined in the template css.
 - CSS should cascade like this `basecss` -> `widgetcss` -> `templatecss`. So that the template css can be used override the others
 - Main Template html, js, and script files should go into `src/html`, `src/js`, `src/css` folders
 - Widgets should go into the `src/widget` folder
 - Widgets should contain `template.html`, `itemtemplate.html`, `script.js`, and `styles.css` inorder for the helper's `createWidgetLoader` function to do its standard widget binding

### Client Side Templating
 - All html templates should be in a `<script type='text/html'></script>` element
 - Template html should be loaded into global variables to be bound on demand
