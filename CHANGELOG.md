[//]: # "Types: Added | Changed | Deprecated | Removed | Fixed | Security"
[//]: # "Source: http://keepachangelog.com/en/1.0.0/"

# Changelog
All notable changes to this project will be documented in this file.

## [0.3.3] - 2022-01-12 
   
#### changed
- badge counter now exclude disabled rules 

#### Fixed
- import from remote json
- scroll stuck for firefox

## [0.3.2] - 2020-01-23 
   
#### Added
- "Options" button to easly open the extension options page

#### Fixed
- CRITICAL Bug which was blocking the extension from reading the rules list eng tab data

## [0.3.0] - 2020-01-19  

#### Added
- A new property for the rules: "Top frame only" (enabled by default). 
  - if *enabled* the rule will be injected ONLY in the top frame of the page (when the selector matches the tab url, as it has done up to now)
  - if *disabled* the rule will be injected in iframes too.
- A new Rule UI indicator for the rules injected in iframes (a dotted light blu border on the right)
- Support for MAC `COMMAND + S` in the editors

#### Changed
- Replaced the old "Active Tab data" system to handle async calls and navigations in the background.js
- Repository files rearranged
- reworked the badge counter system to display the correct number of active rules 

## [0.2.3] - 2019-04-28  

#### Added
- A *start-grunt.bat* file to run grunt tasks [buld|dev] (to remove the Grunt global SO installation dependency)

#### Fixed
- Some packages compatibilities
- A bug wich was stopping the injection flow when including an axternal css file.
- Outdated error handling in the injector file
- Grip style differences (gray dots) between firefox and chrome for *rules* and *files*.

#### Changed
- Update Monaco editor from 0.13.1 to 0.16.2
- npm packages dependencies refactored


## [0.2.2] - ????-??-?? (skipped)

#### Changed
- Update Monaco editor from 0.9.0 to 0.13.1


## [0.2.1] - 2018-01-20

#### Fixed
- Strange black rendering bars on rules.


## [0.2.0] - 2018-01-14

#### Added
- A *context-menu* to handle rule's actions.
- It's now possible to manually inject a rule (from the rule's *context-menu*).
- A rule can be moved as the first or last in the *rules list* (from the rule's *context-menu*).
- More *import* methods (in the options page).
  - *Local JSON file* read and import a set of rules from a loca json file (from your machine).
  - *Remote JSON file* read and import a set of rules from a remote json file address.
  - *GitHub repository* read and import a rule from a [GitHub](https://github.com/) repository.

#### Fixed
- Multiple injection of the same rule on webkit browsers.
- Appended a *version-control* when requesting remote files to prevent the browser to load cached versions (hopefully).
- Various background fixes.

#### Changed
- Because of the new *context-menu*:
  - The *edit* and *delete* buttons (at the end of a rule bar) are been replaced with a single button which show the *context-menu*.
  - the *edit* action has been moved to the *context-menu*.
  - the *delete* action has been moved to the *context-menu*.
  - the *enabled* option (from the *Editor Page*) has been moved to the *context-menu*.
- It's now possible to choose which rules to *export* (in the options page). 
- Reworked the injection process. Now it should be more stable and secure.
- keymap to quit from the editor view from `esc` to `ctrl + esc`.



## [0.1.1] - 2017-10-10

#### Security
- HTML-String templates conversions are now handled by a native JavaScript constructor to improve security.


## [0.1.0] - 2017-10-09
The initial Beta release




[0.3.3]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.3.3
[0.3.2]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.3.2
[0.3.0]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.3.0
[0.2.3]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.2.3
[0.2.2]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.2.2
[0.2.1]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.2.1
[0.2.0]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.2.0
[0.1.1]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.1.1
[0.1.0]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.1.0