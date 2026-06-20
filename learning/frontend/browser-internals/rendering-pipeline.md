[⬅️ Back to Frontend Engineering](../README.md)

# The Rendering Pipeline

The Critical Rendering Path (CRP) represents the sequence of steps the browser executes to parse HTML, CSS, and JavaScript, calculate layouts, and paint physical pixels onto the screen.

---

## Why It Matters

To achieve fluid, 60 FPS animations and transitions, the browser has exactly **16.6ms** to process a single frame. If a JavaScript script or CSS property update triggers an expensive, CPU-bound calculation during this window, the browser will drop frames, causing visible stuttering (jank). Understanding the stages of the rendering pipeline allows developers to write code that leverages GPU hardware acceleration and avoids redundant reflows.

---

## The 5 Rendering Stages

When a browser loads a webpage or updates the UI, it traverses five main pipeline stages:

```
    [ HTML/CSS Bytes ] ---> 1. DOM / CSSOM Trees Construction
                                     |
                            2. Render Tree Creation
                                     |
                            3. Layout (Reflow geometry calculations)
                                     |
                            4. Paint (Rasterization of pixels)
                                     |
                            5. Compositing (GPU layers compilation) ---> [ Screen Paint ]
```

### 1. DOM and CSSOM Construction

- **DOM (Document Object Model)**: The browser parses HTML bytes into tokens, converts them to node objects, and builds a tree structure representing the document structure.
- **CSSOM (CSS Object Model)**: In parallel, the browser parses stylesheet rules to construct a tree mapping style properties to selectors.
- _Note_: HTML parsing is synchronous. Encountering a `<script>` tag blocks DOM construction until the script is downloaded and executed, unless marked with `async` or `defer`.

### 2. Render Tree Creation

- The browser combines the DOM and CSSOM trees into a single **Render Tree**.
- The Render Tree contains only the nodes required to render the page. Nodes with `display: none` (and their descendants) are completely omitted from the Render Tree, while nodes with `visibility: hidden` are included (as they still occupy space).

### 3. Layout (Reflow)

- The browser calculates the exact geometry—the width, height, and coordinates—of every visible node relative to the viewport.
- **Cost**: Highly CPU-intensive. Changing geometric CSS properties (e.g., `width`, `height`, `margin`, `padding`, `top`, `left`, `border`) triggers a full Layout recalculation for the affected DOM branches.

### 4. Paint (Rasterization)

- The browser fills in pixels. It draws text, colors, images, borders, and shadows.
- **Cost**: Medium-to-high. Painting is done across multiple software layers. Changing visual-only properties (e.g., `color`, `background-color`, `box-shadow`, `visibility`) bypasses Layout but triggers Paint.

### 5. Compositing

- The browser groups elements that have been promoted to separate layers, compiles them on the GPU, and draws them to the screen.
- **Cost**: Very low. Changing properties that are handled entirely by the GPU compositor (specifically `transform` and `opacity`) **bypasses both Layout and Paint**. This is the most performant path for animations.

---

## Hardware Acceleration & Layer Promotion

You can force the browser to promote a DOM element to its own GPU compositor layer. This isolates updates to that element, preventing it from triggering paints on neighboring elements:

- **Modern CSS**: Use `will-change: transform` or `will-change: opacity`.
- **Legacy CSS Hack**: Use `transform: translateZ(0)` or `transform: translate3d(0,0,0)`.

> [!WARNING]
> Do not promote every element to its own layer. Creating too many compositor layers consumes significant GPU memory and increases overhead, which can actually degrade mobile device scrolling performance.

---

## Real-World Production Learnings

In an interactive mobile application, our sliding side-drawer navigation suffered from heavy stuttering and frame drops (falling to 15-20 FPS) during the opening transition.

We inspected the drawer component and found the slide animation was driven by modifying the CSS `left` coordinate:

```css
/* BUG: Animating geometry triggers Layout and Paint on every frame! */
.side-drawer {
  position: fixed;
  left: -280px;
  transition: left 0.3s ease;
}
.side-drawer.open {
  left: 0;
}
```

Because `left` is a layout-inducing property, the browser was forced to recalculate the coordinates of the drawer (and recalculate layout flow for neighboring nodes) 60 times per second, blocking the main thread.

We refactored the drawer layout to use CSS `transform` instead:

```css
/* Solution: Bypasses Layout & Paint, animating entirely on GPU Compositor! */
.side-drawer {
  position: fixed;
  transform: translateX(-100%);
  transition: transform 0.3s ease;
  will-change: transform;
}
.side-drawer.open {
  transform: translateX(0);
}
```

This single change bypassed the Layout and Paint stages completely. The browser executed the slide transition purely within the GPU **Compositing** engine. The transition frame rate immediately stabilized at a smooth, locked 60 FPS on mobile grids.

---

### 📖 Related Blog Posts & Reading

- [Ref: How the Browser Rendering Pipeline Actually Works](../../../blogs/How_the_Browser_Rendering_Pipeline_Actually_Works.md)
- [Browser Architecture](./basics.md)
- [Web Performance Metrics](./performance-metrics.md)

---

![Hits](https://api.visitorbadge.io/api/visitors?path=vkondi.atlas.learning.frontend.browser-internals.rendering-pipeline.md)
