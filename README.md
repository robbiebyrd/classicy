# [Classicy (Previously Platinum)](https://classicy.ing)

A UI framework using native CSS/JS replications of the Mac OS 8.1 interface components.

[Just curious? Visit our website to learn more.](https://classicy.ing)

## Demo

[`See a demo here!`](https://robbiebyrd.github.io/classicy/)

## Running Locally

The Classicy components are created in React. For demo purposes, we provide a very basic Next.js app for testing.

You will need Node.js v20.11 or higher. You will also need the `yarn` package manager.

1. Clone this repo to your local computer and change into the folder
    ```bash
    git clone https://github.com/robbiebyrd/platinum
    cd platinum
    ```

2. Install the necessary dependencies.
    ```bash
    yarn
    ```

3. Modify the .env file to the below and make sure it is loaded.
   '''
   NEXT_PUBLIC_BASE_PATH=""
   '''

4. Start the Classicy Destkop server in development mode.
    ```bash
    yarn dev
    ```

4. Open your web browser to [http://localhost:3000](http://localhost:3000) .

5. To view the Classicy UI Components, run the Storybook Development server.
    ```bash
    yarn storybook
    ```

## Acknowledgements

- New Dawn by [`Nathanael Gentry`](https://github.com/npjg)
- Scrollbars of the Classic Mac OS by [`Jessica Stokes (@ticky)`](https://github.com/ticky)
- `after-dark-css`, for the basic System 7.1.1 interface
- [`flyer`](https://www.masswerk.at/flyer/), for further inspiration
- Robin Casady, for releasing ChicagoFLF into the public domain
- Apple, who maintains the copyright on the background patterns, icons and interface components

## Features

*Legend*

|          |                     |                     |
|:--------:|:-------------------:|:-------------------:|
|    ✅     |         ℹ️          |         ⚠️          |
| Complete | Partially complete. |    Experimental     |
|          |                     | *Subject to change* |

- Desktop
    - ℹ️ The ubiquitous Finder
    - Menubar
        - ✅ System Menu
        - ℹ️App Switcher
            - Does not currently switch apps on click
        - ✅ Widgets
            - ℹ️Date/Time
                - Need to create Control Panel widget to adjust settings
    - Icons
        - ✅ App Shortcuts
        - ✅ Cleanup
        - Arrange By…
- Sounds
    - ✅ Sound Provider
    - ✅ Load sound theme from JSON
    - ✅ Audio Sprites support
    - ℹ️ Sound Manager Control Panel
        - ⚠️ Sound Event Handler
            - NOTE: This is under development and subject to change.
            - ✅ Event dispatcher/player
            - Automatic event intercept and play for known events (map audio sprites to events)
- Appearance Manager Control Panel (Theme Manager)
    - ℹ️ Appearance Manager Control Panel
        - Currently, does not allow creating custom themes, but can switch between loaded themes
    - ✅ System
        - ✅ Load theme from JSON
        - ✅ System events for modifying theme
    - UI
        - ✅ Typography settings
        - ✅ Measurement settings
        - ✅ Desktop settings
        - ✅ System colors
        - ✅ Configurable color variables
    - ✅ Color Theme-able components
- App Template
    - ⚠️ App Context/Event Handler
    - App Switcher
- Window
    - Controls
        - ✅ Zoom
        - ✅ Resize
        - ✅ Collapse
        - ✅ Close
        - Placard
        - ✅ Header
    - Dialog
        - Modal
            - Dialog
                - ✅ Movable
                - Non-movable
            - Alert
                - Movable
                - Non-movable
        - ✅ Modeless
    - ✅ Standard
- System
    - ⚠️ File System
        - ⚠️ Integrated into Finder.app
- UI Components
    - ✅ Text Input
    - ✅ Text Area
    - ✅ Button
    - Tabs
    - ✅ Radio Button
    - ✅ Drop-down menu
    - Multi-select menu
    - ✅ Checkbox
    - ✅ Bevel Button
    - Slider
    - Spinner
    - Date/Time Picker
    - ✅ Expandable (Disclosure)
    - ✅ Fieldset
    - ✅ Separator
    - ✅ Progress
    - Menu
        - ✅ Contextual Menu
        - Submenu
    - Gallery Picker (Slider)
    - Color Picker

## Component Organization

* `<ClassicyDesktopProvider>`
    * `<ClassicyDesktop>`
        * `<ClassicyDesktopMenuBar>`
        * `<ClassicyDesktopIcon?>`
        * `<YourClassicyApp>`
            * `<ClassicyAppContext>`
                * `<ClassicyApp>`
                    * `<ClassicyWindow?>`
                        * `<ClassicyUIControls?>`
                        * `<OtherReactNodes?>`

## Events

* `ClassicyDesktop`
    * `ClassicyDesktopClick`
    * `ClassicyDesktopDrag`

* `ClassicySoundPlay`
    * `ClassicyAlertSosumi`
    * `ClassicyAlertWildEep`
    * `ClassicyAlertndigo`
    * `ClassicyBeep`
    * `ClassicyBoot`
    * `ClassicyButtonClickDown`
    * `ClassicyButtonClickUp`
    * `ClassicyInputRadioClickDown`
    * `ClassicyInputRadioClickUp`
    * `ClassicyMenuClose`
    * `ClassicyMenuItemClick`
    * `ClassicyMenuItemHover`
    * `ClassicyMenuOpen`
    * `ClassicyWindowClose`
    * `ClassicyWindowCollapse`
    * `ClassicyWindowControlClickDown`
    * `ClassicyWindowControlClickUp`
    * `ClassicyWindowExpand`
    * `ClassicyWindowFocus`
    * `ClassicyWindowMoveIdle`
    * `ClassicyWindowMoveMoving`
    * `ClassicyWindowMoveStop`
    * `ClassicyWindowOpen`
    * `ClassicyWindowResizeIdle`
    * `ClassicyWindowResizeResizing`
    * `ClassicyWindowResizeStop`
    * `ClassicyWindowZoomMaximize`
    * `ClassicyWindowZoomMinimize`

* `ClassicyDesktopIcon`
    * `ClassicyDesktopClick`
    * `ClassicyDesktopAltClick`
    * `ClassicyDesktopDoubleClick`
    * `ClassicyDesktopDrag`

* `ClassicyApp`
    * `ClassicyAppOpen`
    * `ClassicyAppClose`
    * `ClassicyAppHide`
    * `ClassicyAppFocus`

* `ClassicyWindow`
    * `ClassicyWindowOpen`
    * `ClassicyWindowClose`
    * `ClassicyWindowZoom`
    * `ClassicyWindowCollapse`
    * `ClassicyWindowResize`
    * `ClassicyWindowDrag`
    * `ClassicyWindowFocus`
    * `ClassicyWindowContentScroll`
    * `ClassicyWindowContentClick`

* `ClassicyMenu`
    * `ClassicyMenuHover`
    * `ClassicyMenuClick`
    * `ClassicyMenuChange`

## The Development Story

### Beginnings

My first real job was working in the pre-production department of my local newspaper. During the afternoons, I would
typeset press releases and public notices. But, in the evenings, up until the legally-allowed time for a 15-year-old to
remain on the clock, I would transform the digital PDF pages of some 15+ publications, sent in over modem, onto
photographic film. I would take the processed negatives, sometimes 20 feet in length before being cut to newsprint size,
and blast them with ultraviolet light, projecting an eerie purple glow onto aluminum plates. After a sufficient searing,
I would wash the plates with harsh chemicals and dry them with blasts of nitrogen, and then they would be screwed onto
the humungous web-fed printing presses.

It still seems crazy that anyone would allow a teenager to handle dangerous chemicals, stick their hands in giant metal
stamping presses, and once I turned 16, drive across seven counties, unsupervised, in a gigantic panel van. I hardly
ever betrayed that trust; in fact, I tried to treat my job like it was a privilege. Except for the one time I slipped in
a fake obituary (so I could show my professor and get out of a 8:15 a.m. exam the next day) I was an exemplary employee.

I loved it all: the photography labs, the huge presses 20 feet tall, the massive ImageSetter that printed, not onto
paper, but onto photographic film. Still, my favorite part of that job were the Macs. My school had once been loaned a
few Macintosh Classic IIs for a month, and I had found myself sneaking back into the classroom and spending as much time
as possible in front of them. When the loan was revoked, I turned to solace in the remaining Apple II in the corner that
nobody else cared to use.

I had desperately wanted a Mac, but the reasoning of the time was against me: Apple was not doing well, and software in
retail stores was difficult to come by. Windows 3.1 was the dominant force, and Windows 95 promised to revolutionize the
PC experience by making it equivalent with MacOS.

So, when I got my job at the newspaper, which ran exclusively on Macs, I relished every second with my darlings. I would
spend late nights there, sometimes attempting to learn Pascal, but mostly poking and prodding at every button, setting
and Preferences file I could find. Sometimes, on Saturdays, with little to do between deadlines, my supervisor would let
me invite my friends over. The four of us, spread between the four blazing-fast PowerMac G3s in the office, would play
Doom or Quake until the final newspaper of the day would submit its morning edition at 2 am.

### The history of MacOS

I grew to love my MacOS machines, and as I transitioned my love of newspapers from high school job to early career, I
was delighted to find I got to use my Mac every single day. I would even drag an iMac from work to home every evening,
presuambly so that I could “do work,” but really because I just loved the MacOS experience. My aged PC monstrosity in
the corner was largely ignored. I certainly did not have the money to buy a new Mac, but carting a Bondi Blue beauty
back-and-forth from work would do just fine: especially since it had a handle.

That’s not to say it was all sunshine and rainbows: in fact, MacOS Classic was awful. It wasn’t truly a multitasking
operating system, it had terrible memory management, and, in an effort to support the 6800 CPU, could in fact force the
operating system to run in 24-bit mode. The whole thing was insanity, and you simultaneously ran more than one
application at your own peril.

The problems of MacOS were not new; in fact, DOS and Windows (up until Windows XP) had largely similar problems. It was
Apple’s lack of real, usable solutions, however, that caused MacOS to linger while Windows thrived. Apple abandoned its
own development platform, MacApp, with MacOS 7, and instead third-party tools were the only available development
platforms on the Mac. Apple tried to make parternships with other companies, like Symantec, to make developer tools, but
ultimately mis-management and corporate animosity ended these arrangements quickly.

It’s easy to get confused, as Apple has changed the name they use to refer to the Macintosh’s operating system. Here’s a
quick table of the name’s evolution:

| OS Name                   | Version(s) | Release Date(s)                   | Notes                                                                           |
|---------------------------|------------|-----------------------------------|---------------------------------------------------------------------------------|
| Macintosh System Software | 1.0-3.0    | January 1984-January 1986         | Original OS shipped with the Mac                                                |
| System Software 1.0       | 3.1-3.4    | February 1986-June 1986           |                                                                                 |
| System Software 2.0-2.0.1 | 4.0-4.1    | January 1987                      |                                                                                 |
| System Software 5         | 5.0-5.1    | October 1987                      |                                                                                 |
| System Software 6         |            | April 1988-March 1992             |                                                                                 |
| System 7                  | 7.0-7.5.5  | August 1992-September 1996        | The first MacOS version to support multitasking.                                |
| MacOS 7                   | 7.6-7.6.1  | January 7, 1997-April 7, 1997     |                                                                                 |
| MacOS 8                   | 8-8.6      | July 26, 1997-May 10, 1999        | Introduced the Platinum appearance theme and Appearance Manager.                |
| MacOS 9                   | 9.0-9.2.2  | October 23, 1999-December 5, 2001 | Mostly released as a compatibility layer for the transition to the new MacOS X. |

After MacOS X gained traction, and eventually developers ported their ‘Classic Compatibility Layer’ (or ‘Carbonized’)
applications to the more modern and NeXT-based ‘Cocoa’ framework, Apple renamed all versions of MacOS before OS X 10 as
“Classic” MacOS. Sometime in the late 2010s, apple began lowercasing the Mac when referring to its modern OS, stylizing
it `macOS`.

It had been some time since I used a MacOS Classic computer regularly. These days, I may occassioanlly need to open a
file in QuarkXPress 3 or NewsEditPro from my days as a newspaper reporter; I even still remember all the keyboard
shortcuts, it turns out. But, largely, I have forgotten this old and trusted friend.

I’ve used versions of Windows from 2 to 2022, OS/2 from 2 to Warp, BeOS, Netware, Irix, Solaris and every flavor of
Linux I can find. And, of course I stare every day at the latest incarnation of macOS. But, still, I love the visual
feel of Platinum, the name Apple gave to the UI in MacOS 8 and 9.

### MacOS 8

MacOS 8 was released in July of 1997, nearly four years after it was first announced as "Copland" in 1994. In reality,
Copland had been in the works since 1988 as Project Pink, and involved a drama of epic proportions with all the major
computing titans of the time. System 7, the predecessor to MacOS 8, was aged--like, horribly aged. Apple, in financial
trouble, was concerned that the rise of Windows could spell the end of the Macintosh. It tried selling System 7 as a
replacment operating system OS/2 to IBM, but the project named Taligent fizzled within 2 years. Internal development was
almost at a standstill, and the **company** eventually looked outward.

BeOS, an alternative operating system for Apple and clone PowerPC computers, looked promising, but eventually Apple
turned to Steve Jobs and his company NeXT. The NeXT OPENStep framework was already cross-compatible and mature, while
BeOS, while impressive, was new and had large gaps in functionality.

Steve Jobs, returned to his throne at Apple, decried that the remnants of Pink and Taligent would become MacOS 8 (and
eventually MacOS 9), while the NeXT's UNIX-based operating system would become MacOS X (or 10). MacOS 8-9 were a bridge
to the future; while most of the litany of changes were foundational adds and performance tweaks, the new Platinum user
interface from Copland was introduced, which remained through the life of MacOS Classic (and, in fact, was the UI for
the first release of MacOS Rhapsody, the forefather of the modern macOS).

Since the release of the Hierarchical File System (or HFS) with the Macintosh Hard Disk 20 in 1985, files included
multiple forks. All files contained a "data" fork, or the actual contents of the file; however every file could also
contain a Resource Fork, or additional data store within the same file. A word processing document could, for instance,
store the text contents within the data fork, and store any embedded images within the Resource fork of the file.
Applications often used these Resource forks as well to store things like icons, images, patterns, sounds, color
pallettes, and tons of other metadata. It's sometimes quite amazing the raw resources available in these Resource forks.

I went about extracting these Resource forks to see what I could find.

### Booting it up

First, I downloaded the MacOS 8.6 install cd from the Internet Archive. I was sure I had done something wrong, though,
when I double-clicked on the ISO file I downloaded: nothing happened. In fact, you have to use
a [third-party tool to mount HFS disks in modern macOS](https://www.matthewhughes.co.uk/how-to-mount-hfs-classic-drives-on-macos-catalina-and-later/).
Even then, I had trouble extracting the Resource Forks. So I decided it was time to return to my old friend.

I decided what I needed was an actual running version of MacOS 8. I first thing I tried was the very
awesome [Macintosh.js](https://github.com/felixrieseberg/macintosh.js) app
from [felixrieseberg](https://github.com/felixrieseberg/macintosh.js), but ran into a few setbacks. First, the emulated
system is running a 68K processor, and therefore the maximum verison of MacOS those processors can run is 8.1. MacOS
Platinum hadn't quite been fleshed out until MacOS 8.5. Also, I had trouble extracting files with their Resource Forks
intact (more on that later).

It then became necessary to take the more complex route and download MacOS 8 and
install [SheepShaver](https://www.emaculation.com/doku.php/sheepshaver), which emulates a full PowerPC Mac. SheepShaver
allows us to run all the way up to MacOS 9.0.4. I could have installed MacOS 9; however, very few UI changes took place
between MacOS 8.6 and MacOS 9, and because the MacOS 8 interface guidelines are publicly documented, I've decided to
focus on 8.6.

Installing SheepShaver is easy, but getting it setup is a little more complicated. First, you need a MacOS ROM file. I
tried an [older ROM file](https://archive.org/details/mac_rom_archive_-_as_of_8-19-2011) that contained the Macintosh
Toolbox, the part of the ROM that contained some UI specifics. But try as I might I could not extract any resources from
the ROM file. I decided instead to use a [New World ROM](https://en.wikipedia.org/wiki/New_World_ROM), even though I was
pretty sure the Macintosh Toolbox assets would not be included; I'd have to look inside the OS itself.

I placed the SheepShaver app, the MacOS ROM file in my Applications folder. I opened SheepShaver and went straight into
the settings, ignoring the failing boot. First I created a new Hard Drive disk, and added my Mac OS 8.6 Install CD ISO
into the window. Next, I made sure my ROM file was correct in the settings, and set my “Unix Root” to my home folder. I
changed the RAM to 64 MB, and then switched to the Audio/Video tab to adjust my resolution and enable QuickDraw
acceleration.

Then, in a strange example of a bad UI, I force-quit SheepShaver and re-opened, and then magically my new Mac began to
boot.

![Screen Shot 2024-02-08 at 12.49.10 PM 1.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/26325A87-8FA6-4302-9DB6-AF51589B6471_2/nbcqegm8wOnDKXtaBa5ckzqxabcNxZqgIrLtem2C1ewz/Screen%20Shot%202024-02-08%20at%2012.49.10PM%201.png)

### Getting to the good stuff

I downloaded [ResForge](https://github.com/andrews05/ResForge), a Resource Fork editor, onto my Host Mac to get at the
meat of the files. Resource forks contain a list of Resources, grouped by type. I started looking through the common
Resource fork types I knew of.

| **Name of resource type** | **actual name**     | **Description**                                                     |
|---------------------------|---------------------|---------------------------------------------------------------------|
| cicn                      | color icon          | Defines a color icon used in data                                   |
| clut                      | color look-up table | Defines a color palette used in data                                |
| CURS                      | cursor              | Defines the shape of a monochrome cursor (8 × 8 bit square)         |
| icl8                      | 8-bit icon list     | Defines an icon displayed in the Finder                             |
| icns                      | 32-bit icon list    | Defines an icon displayed in the Finder                             |
| ICON                      | icon                | Defines a monochrome item used in data                              |
| MooV                      | movie               | Stores a QuickTime movie                                            |
| PICT                      | picture             | Stores a PICT image contained in the file                           |
| snd                       | sound               | Stores a sound used in the file                                     |
| styl                      | style               | Defines style information, such as the font, color and size of text |

With MacOS 8 and the Platinum interface, also came the Appearance Manager, a sytem utility that allows you to tweak the
interface. While not fully documented and released until MacOS 8.5, the Appearance Manager could use theme files to
change the appearance of the system. And by change, I mean dramatically. Before Apple fully embraced the idea, I spent
hours and hours using [Kaleidoscope](https://en.wikipedia.org/wiki/Kaleidoscope_(software)) to craft the perfect desktop
UI. Luckily, Apple created a theme file for it's default Platinum UI, allowing us to peruse the Resource fork for some
juicy UI morsels.

In the **Macintosh HD: System Folder:Appearance:Theme Files** is a filed named Apple platinum. I copied this folder from
my SheepShaver instance to my local machine and opened up Resforge to dive in. I also copied and opened up the
Appearance Control Panel, found in the **Macintosh HD:System Folder:Control Panels** folder.

Also, found within those files, are these very nice and fun credits:

> **Apple Platinum**

> Designed by Pat Coleman, Jennifer Chaffee Special Thanks to Elizabeth Moller, Paula Brown, Don Lindsay, Lynn Shade and
> Takumi Takano

> **Appearance Manager**

> *Does that Theme Switchin' Thang.* ... Our Favorite Buildmeister (he's so cute): Robert Bowers

I don’t know who Robert Bowers is, but this is how I would want to be remembered in perpituity.

![Screenshot 2024-02-07 at 9.40.20 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/A6534659-B5DC-4678-B06A-2F3747C4207D_2/kROkLiFOWlM9mBxsXgkT2uXArvFqtKAAvzDZ4ynZWdcz/Screenshot%202024-02-07%20at%209.40.20PM.png)

![Screenshot 2024-02-07 at 9.38.58 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/0DCA48F9-DDB5-40C0-9FAD-3D84E650C30F_2/jawVySKCQHHS5yaqc1RgavnZwF8LondFk6MN7aqqFCQz/Screenshot%202024-02-07%20at%209.38.58PM.png)

Theme Colors and Appearance Manager theme previews from Apple Platinum theme file and Appearance Manager Control Panel,
opened in ResForge

I also copied over the **Macintosh HD: System Folder:Appearance:Sound Sets:Platinum Sounds** file and extracted all the
awesome interface sounds from that file. MacOS 8 was awesome in that, not only could you provide a theme file for the
visual part of your experience, you could also load in a sound theme. This was definitely a devisive feature; as a
youth, all the clicks and clacks delighted me, but my older co-workers were adamantly against.

![Screenshot 2024-02-07 at 9.53.52 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/1EF1BBAE-A003-4BD3-8EE1-4497D7B4888D_2/M66FErMndNAxRUvh5MD78mkmrtwOFODJH5ardiSzxTQz/Screenshot%202024-02-07%20at%209.53.52PM.png)

Interface Sounds Files from the Platinum Sound set

Other files with gold are the Macintosh HD:System Folder:System, Macintosh HD:System Folder:System Resources and
Macintosh HD:System Folder:Finder have several resources we will need, such as cursors, icons and images.

I used [Permute from Setapp](https://setapp.com/apps/permute) to do image and sound conversions; most of the images,
patterns and icons will be exported as ICNS or TIFF, and the sound resources will be exported as AIFF. I chose MP3 as
the final audio format, though I may add support for multiple formats (such as OGG and M4A) at a later time.

I specifically chose PNG for icons because I needed support of the Alpha channel. MacOS icons on the desktop are
overlaid with a halftone pattern when opened; we needed the alpha channel so we could keep the shape of the icon while
also overlaying the pattern.

![Screenshot 2024-02-07 at 10.04.46 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/D70C40F9-E8CA-4CB0-9C3F-8C99F9E77D4A_2/pqK50Uj8xpKVQhPw8I23zEoA2xJvLsxzMoMEQWAUfHYz/Screenshot%202024-02-07%20at%2010.04.46PM.png)

A un-opened and opened Desktop Icon in MacOS 8. The system applies a halftone pattern to open application icons.

I also extracted the Chicago and Charcoal fonts, though I ended up using an open-source, re-rendered version of the
Chicago font.

While it was time consuming, it was still relatively simple to find the raw image and audio resources I needed to
replicate the interaface. What I didn't have were the "geometry" and "composition" of the windows: what color are the
bordes? How are the window borders drawn?

While the Resource forks do contain some information on the geometry of UI elements, they are not exactly human
readable—at least not using ResForge. I could have used a more specialized Resource fork editor, such
as [Resourcerer](https://www.mathemaesthetics.com/EdInfo.html), which might have given me more options to extra UI data
from system files. However, I wasn’t counting on this being the case.

I also attempted to decode [MacApp](https://en.wikipedia.org/wiki/MacApp), the original Apple-supported development
framework for MacOS Classic apps, in both its Pascal and C++ variants. However, I found the project had been abandoned
far before the Platinum user interface was introduced, so the results were not what I had hoped: I saw a lot of System 7
interface components, but nothing specifically Platinum.

To my surprise, though, the Platinum interface that I had fallen in love with hadn't been entirely introduced in MacOS
8: in fact, small bread crumbs had been left in later versions of System 7.

![Mac_OS_7.6.1_emulated_inside_of_SheepShaver.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/B5FC528E-6762-42AE-8E73-BA8C67E0576A_2/qi7xxBsAmC947g3yFer0XuWUj270zZOeI2vkGgxD2Jkz/Mac_OS_7.6.1_emulated_inside_of_SheepShaver.png)

The System 7 Control Strip component, showing early hints of the upcoming Platinum interface.

![Screenshot 2024-02-08 at 2.00.30 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/F601C2D3-8B35-4EEC-B933-8D5B48FFC91C_2/3N4B5o25e2nuOf3omQFnBscMDJuxhtPWeVZ50fIsrsMz/Screenshot%202024-02-08%20at%202.00.30PM.png)

![Screenshot 2024-02-08 at 2.04.33 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/4DFF2F26-52FB-4605-8754-95E4735B50FB_2/BzUW0xjLyrySfRacQR67bnagyRInExRlBjioZRYomEwz/Screenshot%202024-02-08%20at%202.04.33PM.png)

A System 7 vs MacOS 8 Window. While different, there are visual similarities between the two.

I had little luck in finding any geometry information about the windows, so I decided to study
the [Apple Human Interface Guidelines](http://interface.free.fr/Archives/Apple_HIGOS8_Guidelines.pdf) for MacOS 8. There
is a treasure trove of detailed UI schematics available, but the manual doesn't specify any colors or measurements for
the UI elements.

![PICT 128.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/950BC5FF-2FD8-4D1E-A41D-F70868B54027_2/oMJwx7qKxkTnKA3GtxnjueyxsgNc6YEeiouDivsbItEz/PICT%20128.png)

The Apple Platinum theme logo, hidden inside the `Apple platinum theme` file's Resource fork.

Nearly all of the standard HTML elements are represented in the HIG: everything from buttons to fieldsets are presented.
I started to jot down, in my notebook, all the different components and how they were related to one another: a Button
would contain text and, possibly, an image, while a Window would contain any number of other UI components. Before long,
I had a pretty strong hiearchary of all the components and how they interacted.

There are a lot of very specific advisements in the HIG around proper element spacing and alignment; I made it a goal to
bake these in where possible, but I also remembered that the goal of this project was to be a wrapper for another
application. I can provide guides, but ultimately the developer will own the finished result.

There were also a few components I decided against making. The Control Strip, ubiquitius in MacOS as an easy way to
change system settings without switching to a Control Panel application, is not really suited for a web app. As well, I
decided against the Utility and Palette window styles, as I didn't see myself using them at the moment. I've tagged them
as efforts for another day; we still have plenty left to do.

# Modeling the UI

If I was going to rebuild the UI from scratch, I was definitely going to need some colors. I was pretty sure that
screenshots of a running MacOS 8 system inside an emulator would not represent the color of Platinum accurately. My
initial tests showed this to be true; I could get different values based on the ROM I used or the Video adapter tweaks I
made. The HIG didn't specify colors by value, but I hoped I could find them in a Resource fork somewhere.

Luckily, I was, along with the colors of all the default color theme variants that came with MacOS 8. There were 7
distinct shades of gray for the system interface, not including black and white. Things like window backgrounds, border
colors and other common interface elements use these 7 shades of gray to draw the bulk of the interface.

In MacOS 8, elements like scroll bars, menu selections and text highlighting are given an additional "color" variation
theme. This gives the interface an additional layer of customization, without radically changing the entire UI. 20 color
variations were included with MacOS 8.6; by default, the system used the "Lavender" color scheme.

![PICT 2000.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/F06C12B9-BAF0-4BC0-AF1B-A319963CE9F6_2/iL7puRdUWDFKLNB97Hk50pEKF41EPShY9OJmEHlsRwIz/PICT%202000.png)

![PICT 2006.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/AAE6C5D2-24D6-45EB-8162-072193EA766E_2/4RWcpRQRf6PDQJgy80jE955NTKl7FqLaVYb3msXQi9Uz/PICT%202006.png)

![PICT 2001.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/169D21AE-4C03-41D0-92F7-1C7F448CA416_2/dy7ZYFPB08bgkCQJYIxgxfH9soPcxKFHd7Xd07BoHlUz/PICT%202001.png)

![PICT 2003.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/1FC41A12-A8ED-4D04-8B93-A766752DE1E1_2/mTL2eodICmwzcaLNou1Ed5JZTzVb45WG6GiozObpI44z/PICT%202003.png)

Default themes shipped with MacOS 8.6: Default, Sunny, Bubbles and Golden Poppy.

And, to top it all off, you could combine a color variation, background image, system font and sound theme together to
create your own custom Platinum theme. You could then save these themes and then switch between them. I often took
advantage of this, creating a "Dark Mode" theme which helped a dark-room-adjacent server stop bleeding light onto my
negatives.

Each color variation is made up of 7 shades of color, ordered from darkest to brightest.

![Screenshot 2024-02-07 at 9.36.06 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/BA8106A1-BBCB-4F14-A1EB-7B6E0BF24A4F_2/9Qj76bqhsRe8vqyiaVoxX5cmEwOyiVxm50GQMoQA1MIz/Screenshot%202024-02-07%20at%209.36.06PM.png)

![Screenshot 2024-02-07 at 9.36.14 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/9C855176-1472-4DD5-A0E1-7986075049AC_2/ogPRHqCmsKHJa4gaFm6soIJIlNpxG0PIrLytHDNZxT0z/Screenshot%202024-02-07%20at%209.36.14PM.png)

Apple Platinum theme file, and the colors for the Bondi theme, opened in ResForge

I extracted these colors, as well as a few background images I found in the theme file.

Then, I took a ton of screenshots. I installed as many late-model apps as I could find: I scoured the Macintosh
Repository and the Internet Archive for Shareware CDs. I looked for a Hotline server archive, but alas I could not find
one.

I focused a lot of my research on AppleWorks 6; while it seemed like an outlier in terms of design and didn't always
follow Apple's own HIG, most of the system components were left unmodified. I used this app as a reference sketch for
plotting out how I would componentize this entire UI later on.

### Creating the React components

It had all the components that I thought I would need. I made a list, checked against the HIG to see if I'd missed
anything, and came up with the following:

- Desktop
    - Desktop Menu Bar
        - Images
    - Context Menu
        - Window
            - Regular Window
            - Modal Window
            - Title Bar
            - Control Boxes
                - Close
                - Zoom
                - Collapse
                - Resize
            - Scoll Bars
            - UI Components
                - Button
                - Dropdown Menu
                    - Long variant, with values
                    - Short variant, with no values
                - Checkbox
                - Radio button
                - Fieldset (control group)
                - Progress
                - Text Input

I'm sure there will be other components I want to add over time, but I felt like this was a good starting place.

I was pretty confident about my choices here, and I must admit it is only because I've been keeping a secret. This isn't
the first time this has been done, and in fact, this isn't the first time that I've done this. My
project [https://github.com/robbiebyrd/platinum](https://github.com/robbiebyrd/platinum) was already in existence well
before I decided to revisit this topic again after 4 years.

I first created my version of [Classicy (as Platinum)](https://github.com/robbiebyrd/platinum) in 2019 by forking the
amazing work
of [npjg](https://github.com/npjg) and his [https://github.com/npjg/classic.css](https://github.com/npjg/classic.css)
project. I extended it as part of [my project 9/11 Realtime](https://github.com/Keeping-History/rt911/) and used it as a
time-representative user interface.

The Classicy project was created using a mish-mash of CSS from several projects and a spaghetti-code mess of event
handlers for controlling things like window resizes and closes. It has so far been starred 44 times and used in a
handful of post-grad student projects. It has been embarressing for me to connect with up-and-coming developers around
the world, trying to debug code I'm sure would deny them their well-earned degree.

Ever since, I've wished I could go back and start over with a modern framework. I had transitioned into backend
development a few years before, so I had missed a lot of the fun involved with component-based design and, especially,
the React framework. I decided it was time to re-teach myself how to front-end dev again, and this was the perfect
project to work on.

I spent a little time refreshing my consulting site, [Space Hippo](https://www.gospacehippo.com), and learning about
React's effect hook to make fun animations. Then I dove into state management and event reducers, and found soon React
was the perfect tool for a Platinum project revamp.

I sketched out the component structure as follows:

- `<ClassicyDesktop>`
    - `<ClassicyDesktopContext>`
        - `<AClassicyApp>`: A Custom app
            - `<AppContextProvider>`
                - `<ClassicyDesktopIcon>`
                - `<ClassicyWindow>`
                    - `<ClassicyUIComponents?>`
                    - `<AnyOtherReactComponent>`

I deliberated a lot over the nesting of components, and in the end hoped that this order would allow ClassicyApps to be
more easily packaged. I also hoped that putting a Window in charge of its own contents would not turn out to be a
mistake.

> A React Context is a data structure that allows sharing state between components.

I also decided ultimately to wire up any ClassicyUIComponent that accepted some kind of input directly to the
AppContext. This way, the app itself could keep an eye on the values of each component within each window, allowing one
window to change the contents of another.

Finally, I decided to insert a ClassicyDesktopContext to hold all the system settings; specifically, I needed a place
to store the theme settings. While I eventually decided to use CSS variables to set theme colors throughout the entire
app, I still needed a place to stash Sound file resources, desktop background settings and font selections for the
theme. This allows me to change the theme from inside an App, and have that change copied over to all over Classicy
Apps, Windows and UI Components. In fact, the app Appearance Manager that is included in the Classicy React project is
simply a regular app that reports an Event when the theme is selected from a dropdown. I'll talk more about events
later.

```json
  {
  "id": "bondi",
  "name": "Bondi",
  "color": {
    "outline": "#393939",
    "select": "#DDD",
    "highlight": "#AAA",
    "window": {
      "border": "#000",
      "borderOutset": "#FFF",
      "borderInset": "#CCC",
      "frame": "#CCC",
      "title": "#000",
      "document": "#FFF"
    },
    "black": "#000",
    "white": "#FFF",
    "alert": "#ffFF00",
    "error": "#ff0000",
    "system": [
      "#EEE",
      "#DDD",
      "#CCC",
      "#AAA",
      "#808080",
      "#393939",
      "#202020"
    ],
    "theme": [
      "#C8F8E9",
      "#67DACD",
      "#5AB9AD",
      "#308F91",
      "#0D716A",
      "#00454B",
      "#003333"
    ]
  },
  "sound": {
    "file": "/sounds/platinum/platinum.json",
    "disabled": []
  },
  "typography": {
    "ui": "\"Charcoal\", \"ChicagoFLF\", \"Geneva\", sans-serif",
    "uiSize": "14px",
    "header": "\"AppleGaramond\", serif",
    "headerSize": "22px",
    "body": "\"Geneva\", serif",
    "bodySize": "14px"
  },
  "measurements": {
    "window": {
      "borderSize": "1px",
      "controlSize": "12px",
      "paddingSize": "6px",
      "scrollbarSize": "20px"
    }
  },
  "desktop": {
    "iconSize": "48px",
    "iconFontSize": "12px",
    "backgroundImage": "url(/img/wallpapers/waves_bondi.png)",
    "backgroundColor": "#00454B",
    "repeat": "repeat",
    "position": "center",
    "size": "auto"
  }
}

```

*The JSON contents of the `Bondi` theme.*

Now that I had my components defined, I sketched them out quickly, just for structure. There really wasn't much to them,
but I needed a canvas to start working. I created a blank ClassicyDesktop, ClassicyDesktopIcon, ClassicyWindow and
ClassicyButton as a starting point, with no CSS. Then, I got to the hard, hard work.

I first sketched out the components of a "Platinum" style Window. I knew that this would be my most complicated
component, so I
hoped sketching it out would also help me identify pieces I could break down into smaller components, as well as get an
idea of the types of events and states I would need.

![sketch.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/86106075-8AEB-44D5-AB14-1FE17778E5B4_2/d7kdHSGMx6x9AxIcWZywOkjJZ1gE4ALLJtJjQzVptaEz/sketch.png)

I mocked up each of these components in HTML, and created a bare React component that returned a div for each of the
pieces I sketched out above (sans the scrollbars). I also thought about all the different states and props I would need
to react to as a Window, and typed those up, too.

| Name             | Type  | Required | Description                                                                                                                                                 |
|------------------|-------|----------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| id               | str   | Yes      | The ID of the window                                                                                                                                        |
| appId            | str   | Yes      | The ID of the ClassicyApp that the window belongs to. All windows must belong to an App (though, not all Apps must have Windows).                           |
| title            | str   | No       | The Title Text to display in the windows's Title bar.                                                                                                       |
| icon             | str   | No       | The Icon to show in the Title bar.                                                                                                                          |
| hidden           | bool  | No       | Whether the window is hidden or not.                                                                                                                        |
| closable         | bool  | No       | Whether the window can be closed by clicking the Close button. When false, the Close box is hidden.                                                         |
| zoomable         | bool  | No       | Whether the window can be zoomed by clicking the Zoom button. When false, the Zoom box is hidden.                                                           |
| collapsable      | bool  | No       | Whether the window can be collapsed and expanded by clicking the Collapse button. When false, the Collapse box is hidden.                                   |
| resizable        | bool  | No       | Whether the window can be resized by clicking and dragging the Window resizer in the bottom-right of the window.                                            |
| scrollable       | bool  | No       | Whether the window's inner contents can be scrolled, or whether any overflow should be hidden.                                                              |
| modalWindow      | bool  | No       | Whether the window is Modal or not. Modal windows have a different inner content style.                                                                     |
| initialSize      | [w,h] | No       | The initial size of the window.                                                                                                                             |
| initialPosition  | [x,y] | No       | The initial screen position of the window.                                                                                                                  |
| appMenu          | []    | No       | When a window takes focus, it can change the contents of the Desktop Menu. This holds any custom menu items that should be visible when the window is open. |
| contextMenuItems | []    | No       | When a user right-clicks within a window, a Context Menu is shown. This holds the contents of that context menu.                                            |
| children         | any   | No       | Any contents for the inside of the window.                                                                                                                  |

I implemented a simple state for the ClassicyWindow component, and added it in. I then connected all the props in and
then realized while what I had was functional, it was really ugly. It was time to get to the difficult work of CSS
theming.

### Applying the Theme

As I started zooming into the PDF version of the Apple HIG, I noticed patterns start to emerge: all the window borders,
both out and inset, were consistent throughout. The width of borders were consistent, as were the padding between
elements. It was also easy to see that, where there were variations, they were slight--and they were also repeated. Well
done, Apple.

I was able to make a list of common sizes, and a hierarchy of element boders using the CSS properties `border`
and `box-shadow`.

![windowoutline.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/355653FD-3A9C-4D2C-8743-38D063FBA5FB_2/GDaK93gDDcvcqcH9Ut5xjAl5VcFxH11uLrjjYUgec6Az/windowoutline.png)

An overview of the outlines that make up a ClassicyWindow.

I notcied that there were some pretty hard-and-fast measurements: borders were 1px, and the padding between the outer
window chrome and the inner window contents was 4px. This same 4px spacing also showed up in the title bar: the spacing
between the top of the window and the components of the Window's title bar are 4px.

I picked a few sensible defaults for things like Desktop Icon sizes and UI font sizes, and created a bunch of CSS
Variables to hold all the values. Then, once I was happy with the default look-and-feel, I took the colors I had
extracted from the Appearance theme file earlier, and was able to easily switch between color themes by updating the CSS
variables. It was so easy I thought maybe I had done something wrong at first, but it actually worked. I was even able
to change fonts for the UI with just a property update.

The measurements were harder. In some places I had used `em` values; in others, I had used `px`. This mish-mash of
measurements really made weird visual errors hard to track down. Finally, I decided on a set of arithmetic standards
based on the window border, window padding size and window control size. Using these three measurements and the
CSS `calc()` function, I was able to get a tighter grip on the visual style. It also made things so much easier as I
continued to add components, as I had already established a good measurement system and ratios that were consistent
throughout.

I created a shared SASS module that created CSS classes for all the themes, so that updating the ClassicyDesktop
component's class name would update all the child components. I created a SASS array of color values for each color
theme; adding additional color or system themes is as easy as creating a new class and changing a few input variables to
the `appearanceManagerTheme` mixin function. Then, any Component needs only use CSS variables in their styling to take
advantage of theme changes. A few helper functions for things like borders and bevels are also provided.

A few of the UI elements were tougher; the Platinum Windows's Control boxes, like the close and zoom button, have a
pixelated style I wanted to replicate. I could not find a way to do this with only CSS, so instead I created an SVG and
use it as an overlay to create the same effect.

![Image.tiff.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/AED3D897-5BB9-4526-BEF3-25354973B35C_2/K64dTSwsMEzNvfWTDCdWSIgBvgal0L6byIoRtIDuflkz/Image.tiff.png)

Platinum theme Windows control buttons, like the close button, have a unique, pixel-gradient overlay.

A few other elements, like the collapse and zoom buttons, also required an extra SVG overlay. Thankfully, using the CSS
psuedo-selectors `::before` and `::after` , I was able to overlay both the pixelated gradient and the inner control SVG.

Quite possibly, the component I am most proud of is the HTML Progress element. Using the entire specture of seven colors
in each color theme, I was able to nearly replicate one of the few beautiful parts of the Mac OS 8 Platinum experience.
Compared to the progress indicators in System 7, this splash of color was a generational leap. It feels silly to type
today, but it was true at the time.

### Wiring it together

Now that I was able to make individual windows and components, I needed a way for the entire system to interact. A
multi-window environment is not very user-friendly if the Windows are fighting for control and focus. In fact, it took
me quite a while to wrap my head around all the things that were involved in basic window management.

I needed to provide some basic system settings to all components: specifically, the color and sound themes. I also
needed to provide a place to store which ClassicyApp was active, which Window was active, and a place to store all the
items in the Desktop Menu Bar, which will be shared by all Apps and Windows.

I chose to let the ClassicyDesktop component control which Window was currently active, and ClassicyApps and Windows
could request a window become active by firing an event. At first, I fell unwittingly into a hole known as "prop
drilling" by others, by passing large data structures as props through components. Most of the time, I was only passing
them so they would be available to child components. At first, this kind of made sense, because as a backend developer,
the idea of dependency injection is a real, but often ignored, pain. After too long of this, it became clear that I had
this all wrong. I took a week away from the project, and started doing every tutorial I could find dealing with complex
state and event reducers in React.

After my break and fresh insight, I rewrote the ClassicyDesktop component to use a shared context and an event reducer.
I then did the same thing to the ClassicyWindow component. I typed up a list of events I would need to react to.

| EventName                     | Description                                                                                                                                                                                                                                          |
|-------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ClassicyWindowOpen`          | Fired when a window opens.                                                                                                                                                                                                                           |
| `ClassicyWindowClose`         | Fired when a window closes.                                                                                                                                                                                                                          |
| `ClassicyWindowResize`        | Fired when a user clicks the resizer (RSZR) element in the bottom-right corner. No resizing actually begins until the `ClassicyWindowMove` method is fired.                                                                                          |
| `ClassicyWindowDrag`          | Fired when a user clicks on the Window Title. No dragging of the window actually occurs until the `ClassicyWindowMove` method is fired.                                                                                                              |
| `ClassicyWindowMove`          | Fired when the mouse is moving within the window. If the `ClassicyWindowDrag` or `ClassicyWindowResize` events have been fired, then moving the window will either drag or resize the move in response to the mouse's movement.                      |
| `ClassicyWindowStop`          | Fired when either a `ClassicyWindowResize` or `ClassicyWindowDrag` has finished.                                                                                                                                                                     |
| `ClassicyWindowFocus`         | Fired when the user clicks within the area of the window. Clicking the title bar, contents or outside frame of a window will cause it to become the highlighted window, and all other windows will lose focus.                                       |
| `ClassicyWindowContentScroll` | Fired when a user scrolls the window contents container.                                                                                                                                                                                             |
| `ClassicyWindowContentClick`  | Fired when a user clicks within the window contents area.                                                                                                                                                                                            |
| `ClassicyWindowContextMenu`   | Fired when a user right-clicks within a window. Each window controls the contents of its own context menu.                                                                                                                                           |
| `ClassicyWindowExpand`        | Fired when a user clicks the CLPSE button and the window is currently collapsed. Collapsing makes the height of the window only as tall as the Title bar, and hides the contents of the window. It is the MacOS 8 equivalent of "minizing" a window. |
| `ClassicyWindowCollapse`      | Fired when a user clicks the CLPSE button and the window is currently in an expanded state.                                                                                                                                                          |
| `ClassicyWindowZoom`          | Fired when a user clicks the ZOOM button. Clicking the Zoom button makes the current window as large as the current viewport. Clicking the ZOOM button again will return the window to its previous position.                                        |

I also re-wrote the event handlers I had written for the Windows's control boxes, and took advantage of the event
dispatcher.

Next, I decided that the ClassicyDesktop could also control Opening and Closing ClassicyApps, which would in turn
control its own windows. Opening a ClassicyApp also adds an entry to the `appSwitcherMenu` array, which keeps track of
all the open apps and displays them in the Appication Switcher, the top-right component of the Desktop Menu.

One of the other neat quirks of MacOS Classic and MacOS today is the top Desktop Menu Bar, whose contents changes based
on the current, active window. The Menu Bar is considered contextually relevant to the active window the user is
interacting with. This is in contrast to Windows TaskBar, which is contextually independent.

I decided to let windows attach a MenuBar to the event they fire when they become active, and let the ClassicyDesktop
and ClassicyDesktopMenuBar components use that state to render the menu. This took some time for me to wrap my head
around, being somewhat a newbie again to React, but eventually it became so elegant that I have almost taken it for
granted.

I abstracted out as much even logic as possible into the deepest component I could. I knew that ClassicyWindow events
might need to bubble up to the ClassicyDesktop, but I also knew many ClassicyWindow events would need to go that high,
and could stay within the Window itself. While the events are structuarlly the same, I decided to setup discrete event
dispatchers for components. I knew this means I would have to make two calls for some events.

For instance, to handle a `ClassicyWindowFocus` event, first I need to notify the actual window it has been focused.
This is important so that it could notify the windows' children of a change, and make any visual updates necessary, such
as applying a new "active" CSS class. Then, I need to let the ClassicyDesktop event handler also know the window was
been focused, so it can be set as the active window and raised to the top-most z-index. When handling this event in the
ClassicyWindow, I first dispatch a local `ClassicyWindowFocus` to the Window's event dispatcher. Then, using the same
payload, I dispatch the same `ClassicyWindowFocus` event to the Desktop event dispatcher.

### Demo Time

Finally, I felt like I had enough of staring at invidiual components, and it was time to put something together. I
thought it would be fun to build a tiny little web browser using one of my favorite
sites, [theoldnet.com](https://theoldnet.com).

I took a shot at building out a full App using the framework I'd setup. It looks something like below:

```other
<ClassicyAppContext.Provider value={{appContext, setAppContext}}>
    <ClassicyDesktopIcon appId={appId} appName={appName} icon={appIcon}/>
    <ClassicyApp id={appId} name={appName} icon={appIcon} debug={true}>
        <ClassicyWindow
            id={"demo"}
            title={appName}
            appId={appId}
            closable={true}
            resizable={true}
            zoomable={true}
            collapsable={true}>
            <iframe src={"https://theoldnet.com/"}
                    style={{width: "100%", height: "100%", padding: "0", margin: "0"}}/>
        </ClassicyWindow>
    </ClassicyApp>
</ClassicyAppContext.Provider>
```

The JSX of a basic ClassicyApp using an iFrame to display [theoldnet.com](https://theoldnet.com).

I turned on a built-in "Debugger" that simply shows another window with the current Desktop State and App Context.

![Screenshot 2024-02-09 at 12.38.00 PM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/93AC83A1-6CCC-4CF7-ABAA-23A55FA8FB42_2/YrZk8XViy2if5qF8eFU5Sb6iJKq2NKCWT4ziKV7zLBQz/Screenshot%202024-02-09%20at%2012.38.00PM.png)

A Demo web browser, showing the app's Debugger window.

It worked! Obvisouly, I have some work to do with using iFrames, but it worked like a charm. I decided to see how easy
it would be to build a quick app to change the Theme, and AppearanceManager was born! A little more tweaking, and I had
a full Markdown editor using [MDXEditor.](https://mdxeditor.dev)

![Screenshot 2024-02-09 at 11.44.55 AM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/79BA4E3C-CCDD-4570-885D-C5E183A8BE55_2/ypyt46CrsYOFBmNRRd8l2fIDcxhHVTboeFG3M7QuQ6Az/Screenshot%202024-02-09%20at%2011.44.55AM.png)

![Screenshot 2024-02-09 at 11.44.40 AM.png](https://res.craft.do/user/full/f6bf69d9-c199-b5e2-2561-223aac7866f6/doc/21B84071-5847-4B88-BE10-7257963581FF/E588419A-40CE-44BF-8A04-BB73DC2FCEC9_2/yBPOMacZ2617YsibEHNZx0u072g8yt2eO8HnGdZEM3Mz/Screenshot%202024-02-09%20at%2011.44.40AM.png)

A SimpleText app, using the awesome MDXEditor, and the Demo ClassicyApp app, showing a few basic controls.

### What's next

The current version of Classicy is 0.4.0, a pre-release demo showing the new outline for how the project will work going
forward. My plan is to continue releasing point releases until the system is in a full state for a 1.0 release.

I still don't have a list of the items that will make this a 1.0 release, but I'm hoping that by 0.5 we will have a more
formal release plan.

If you are interested in joining our development, I would love to have you! Feel free to shoot me an email at
me@robbiebyrd.com or find me on [LinkedIn](https://linkedin.com/in/atxrobbieb).


