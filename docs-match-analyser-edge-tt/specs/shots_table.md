# Shot Types Reference

This table lists all table tennis shot types from most defensive to most aggressive.
Shots marked "Y" in the "In Schema" column are included in the database schema.

## Complete Shot Reference

| Shot            | Classification | Valid Distances | Inferred Spin  | In Schema | Schema Key     |
| --------------- | -------------- | --------------- | -------------- | --------- | -------------- |
| Lob             | Defensive      | Far             | Topspin        | Y         | `lob`          |
| Chop            | Defensive      | Mid, Far        | Heavy Backspin | Y         | `chop`         |
| Passive Block   | Defensive      | Close           | No Spin        | N         | –              |
| Chop Block      | Defensive      | Close           | Backspin       | Y         | `chopBlock`    |
| Drop Shot       | Defensive      | Close           | No Spin        | Y         | `dropShot`     |
| Short Touch     | Defensive      | Close           | No Spin        | Y         | `shortTouch`   |
| Push            | Defensive      | Close           | Backspin       | Y         | `push`         |
| Control Floater | Defensive      | Mid             | No Spin        | N         | –              |
| Block           | Neutral        | Close           | Topspin        | Y         | `block`        |
| Counter Hit     | Neutral        | Close, Mid      | Topspin        | N         | –              |
| Drive           | Neutral        | Mid             | Topspin        | Y         | `drive`        |
| Punch Block     | Neutral        | Close           | No Spin        | N         | –              |
| Flick           | Neutral        | Close           | Topspin        | Y         | `flick`        |
| Aggressive Push | Neutral        | Close           | Backspin       | N         | –              |
| Slow Spin Loop  | Neutral        | Mid             | Heavy Topspin  | Y         | `slowSpinLoop` |
| Loop            | Aggressive     | Close, Mid      | Heavy Topspin  | Y         | `loop`         |
| Counter Loop    | Aggressive     | Mid             | Heavy Topspin  | N         | –              |
| Fast Loop       | Aggressive     | Close, Mid      | Heavy Topspin  | Y         | `fastLoop`     |
| Power Loop      | Aggressive     | Mid             | Heavy Topspin  | N         | –              |
| Loop-Drive      | Aggressive     | Close, Mid      | Topspin        | N         | –              |
| Smash           | Aggressive     | Close           | No Spin        | Y         | `smash`        |
| Kill Shot       | Aggressive     | Close           | No Spin        | N         | –              |

---

## Schema Shot Type Enum (14 values)

```
Defensive:  lob, chop, chopBlock, dropShot, shortTouch, push
Neutral:    block, drive, flick, slowSpinLoop
Aggressive: loop, fastLoop, smash
Fallback:   other
```

---

## Inferred Spin Categories

The spin produced by a shot can be inferred from the shot type. This simplifies data entry
and provides consistent spin classification for analysis.

| Spin Category   | Description                                |
| --------------- | ------------------------------------------ |
| `heavyTopspin`  | Strong forward rotation (loops)            |
| `topspin`       | Moderate forward rotation (drives, flicks) |
| `noSpin`        | Flat or minimal rotation                   |
| `backspin`      | Moderate backward rotation (pushes)        |
| `heavyBackspin` | Strong backward rotation (chops)           |

### Shot → Inferred Spin Mapping

| Shot Type      | Inferred Spin   |
|----------------|-----------------|
| `lob`          | `topspin`       |
| `chop`         | `heavyBackspin` |
| `chopBlock`    | `backspin`      |
| `dropShot`     | `noSpin`        |
| `shortTouch`   | `noSpin`        |
| `push`         | `backspin`      |
| `block`        | `topspin`       |
| `drive`        | `topspin`       |
| `flick`        | `topspin`       |
| `slowSpinLoop` | `heavyTopspin`  |
| `loop`         | `heavyTopspin`  |
| `fastLoop`     | `heavyTopspin`  |
| `smash`        | `noSpin`        |
| `other`        | `noSpin`        |

---

## Distance-Based Shot Filtering

The position sector (Q2) determines valid shot types. Shots should be filtered/greyed
based on the selected distance to reduce cognitive load and improve data accuracy.

| Distance | Valid Shot Types |
|----------|------------------|
| **Close** (closeLeft, closeMid, closeRight) | `chopBlock`, `dropShot`, `shortTouch`, `push`, `block`, `flick`, `loop`, `fastLoop`, `smash`, `other` |
| **Mid** (midLeft, midMid, midRight) | `chop`, `drive`, `slowSpinLoop`, `loop`, `fastLoop`, `other` |
| **Far** (farLeft, farMid, farRight) | `lob`, `chop`, `other` |

### Shot Type Valid Distances Matrix

| Shot Type      | Close | Mid | Far |
|----------------|:-----:|:---:|:---:|
| `lob`          |       |     |  ✓  |
| `chop`         |       |  ✓  |  ✓  |
| `chopBlock`    |   ✓   |     |     |
| `dropShot`     |   ✓   |     |     |
| `shortTouch`   |   ✓   |     |     |
| `push`         |   ✓   |     |     |
| `block`        |   ✓   |     |     |
| `drive`        |       |  ✓  |     |
| `flick`        |   ✓   |     |     |
| `slowSpinLoop` |       |  ✓  |     |
| `loop`         |   ✓   |  ✓  |     |
| `fastLoop`     |   ✓   |  ✓  |     |
| `smash`        |   ✓   |     |     |
| `other`        |   ✓   |  ✓  |  ✓  |
