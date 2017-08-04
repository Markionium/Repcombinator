# Repcombinator for DHIS2

## How do i start Repcombinating?

Take the `Repcombinator.js` file and include it in your html page.
```html
    <script src="Repcombinator.js"></script>
```

A repcombinator that is created by the `Repcombinator` object on the window will allow you to load and render tables.

## Creating the repcombinator instance

First we'll create one of those:
```js
const repcombinator = Repcombinator({ 
    apiUrl: 'https://play.dhis2.org/dev/api',
    headers: { 
        Authorization: `Basic ${btoa('admin:district')}` 
    } 
});
```

| Option | Default | Description |
|--------|----------| ---------|
| `apiUrl` |`../api` | Optional api url if you're not working against the same server, user it in a node script, or the api is not located at `../api` | 
| `render` | `{}` | Placeholder for future render options. | 

Additionally any other options will be used as [Request](https://developer.mozilla.org/en-US/docs/Web/API/Request/Request) init options.

## Loading and rendering tables

From there we can ask for reports to combine by providing an array of valid UIDs.

```js
repcombinator
    // Load reports and combine them into a single report object
    .getCombinedReportForReportUids(['GAfj7O21i26', 'osMFFm0FzWO'])
    .then((report) => {
        // Use the repcombinator.renderer to render the report into an element with the ID `report`
        repcombinator.renderer
            .into('#report') // Specify where to render with a DOM selector
            .render(report); // render the report
    })
    .catch(error => {
        // TODO: Handling errors is up to you!
    });
```

# CDN

```html
<script src="https://unpkg.com/repcombinator@1.0.1/dist/Repcombinator.js"></script>
```

# IE10+ Compatibility

To make it work on IE we'll need to add a `fetch` and a `Promise` polyfill.

https://github.com/github/fetch#installation

```html
<script src="https://unpkg.com/promise-polyfill@6.0.2/promise.js"></script>
<script src="https://unpkg.com/whatwg-fetch@2.0.3/fetch.js"></script>
<script src="https://unpkg.com/repcombinator@1.0.1/dist/Repcombinator.js"></script>
```