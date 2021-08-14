# Nody Greeter

[Web Greeter][web-greeter] is created with Python... which is slow. So, I wanted to re-create it with Node.js!

This is experimental, but works. You can use it!

## Features

- Create themes with HTML, CSS and JavaScript!
- Should work everywhere.
- JavaScript error handling, allowing to load the default theme.
- Themes could be simple, or very complex.
- Battery and brightness control.

## Considerations

Themes working in **web-greeter** should work also here. All themes shipped with **web-greeter** are found here as well.

- `icon_theme` configuration is not loaded, as GTK apps don't allow to set a different **X-Cursor-Theme**
- It kinda works

## Differences with `web-greeter`

- As this is not made in **Python**, this should be faster.
- Actual `mock.js` system could cause lots of problems.
- No unnecessary dependencies.
- Won't break on **Node.js** update when installed. **web-greeter** does with **Python**.

## Installation

```sh
git clone https://github.com/JezerM/nody-greeter.git
cd nody-greeter
npm install
npm run rebuild
npm run build
```

This will rebuild **electron** along with **node-gtk** and then build the package root directory inside `build/extracted`. You can pack this dir to whatever you want, like **.deb** with:
```sh
dpkg-deb --root-owner-group --build unpacked
```

[web-greeter]: https://github.com/JezerM/web-greeter "Web Greeter"
