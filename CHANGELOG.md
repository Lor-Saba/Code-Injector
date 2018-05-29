[//]: # "Types: Added | Changed | Deprecated | Removed | Fixed | Security"
[//]: # "Source: http://keepachangelog.com/en/1.0.0/"

# Changelog
All notable changes to this project will be documented in this file.


## [0.2.2] - ????-??-??

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




[0.2.1]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.2.1
[0.2.0]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.2.0
[0.1.1]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.1.1
[0.1.0]: https://github.com/Lor-Saba/Code-Injector/releases/tag/v0.1.0