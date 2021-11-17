# Nody Greeter

[Web Greeter][web-greeter] is created with Python... which sometimes is slow. So, I wanted to re-create it with Node.js!

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

## Dependencies

- lightdm (as obvious)
- gobject-introspection
- liblightdm-gobject,
- liblightdm-gobject-dev
- libcairo2

## Installation

```sh
git clone https://github.com/JezerM/nody-greeter.git
cd nody-greeter
npm install
npm run rebuild
node make build
sudo node make install
```

This will rebuild **electron** along with **node-gtk** and then build the package root directory inside `build/unpacked`. Later, install it with `node install.js`.

Also, you can package `build/unpacked` to whatever you want, like **.deb** with:
```sh
dpkg-deb --root-owner-group --build unpacked
```
## Aditional features

### Brightness control
`acpi` is the only tool needed to control the brightness, besides a compatible device. This functionality is based on [acpilight][acpilight] replacement for `xbacklight`.

udev rules are needed to be applied before using it, check [acpilight rules][acpilight_rules]. Then, lightdm will need to be allowed to change backlight values, to do so add lightdm user to **video** group: `sudo usermod -a -G video lightdm`

You can enable it inside `/etc/lightdm/web-greeter.yml`

### Battery status
`acpi` is the only tool you need (and a battery). This functionality is based on ["bat" widget][bat_widget] from ["lain" awesome-wm library][lain].

You can enable it inside `/etc/lightdm/web-greeter.yml`.


[web-greeter]: https://github.com/JezerM/web-greeter "Web Greeter"
[acpilight]: https://gitlab.com/wavexx/acpilight/ "acpilight"
[acpilight_rules]: https://gitlab.com/wavexx/acpilight/-/blob/master/90-backlight.rules "udev rules"
[bat_widget]: https://github.com/lcpz/lain/blob/master/widget/bat.lua "Battery widget"
[lain]: https://github.com/lcpz/lain "Lain awesome library"
