// This module contains the background service worker to run commands via messages,
// using keyboard shortcuts or menu commands.
//
// Service workers: https://developer.chrome.com/docs/extensions/mv3/service_workers/
// Messaging: https://developer.chrome.com/docs/extensions/mv3/messaging/

import { pandoc } from './pandoc.js'
import optionsWorker from './options/service_worker.js'

// Where we will expose the data we retrieve from the storage.
const storageCache = {
  converters: [
  ]
}

// Adds items to the browser’s context menu.
// Reference: https://developer.chrome.com/docs/extensions/reference/contextMenus/
function createMenuItems() {
  for (const [index, converter] of storageCache.converters.entries()) {
    chrome.contextMenus.create({
      id: index.toString(),
      title: `Copy as ${converter.name}`,
      contexts: ['page', 'link', 'video', 'audio', 'image', 'selection']
    })
  }
}

// Handles the initial setup when the extension is first installed or updated to a new version.
// Reference: https://developer.chrome.com/docs/extensions/reference/runtime/#event-onInstalled
function onInstalled(details) {
  switch (details.reason) {
    case 'install':
      onInstall()
      break
    case 'update':
      onUpdate(details.previousVersion)
      break
  }
  createMenuItems()
}

// Handles the initial setup when the extension is first installed.
function onInstall() {
  fetch('config.json')
    .then(response => response.json())
    .then(data => chrome.storage.sync.set(data))
}

// Handles the setup when the extension is updated to a new version.
function onUpdate(previousVersion) {
  fetch('config.json')
    .then(response => response.json())
    .then(data => chrome.storage.sync.set({ ...data, ...storageCache }))
}

// Handles option changes.
// Reference: https://developer.chrome.com/docs/extensions/reference/storage/#event-onChanged
function onOptionsChange(changes, areaName) {
  const newConverters = changes.converters.newValue
  if (newConverters) {
    storageCache.converters = newConverters
  }
  chrome.contextMenus.removeAll()
  createMenuItems()
}

// Handles the browser action on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/action/#event-onClicked
function onAction(tab) {
  // Retrieve the first converter.
  const [converterCommand] = storageCache.converters
  pandoc(converterCommand, { tabId: tab.id, allFrames: true }, { selectionText: true })
}

// Handles the context menu on click.
// Reference: https://developer.chrome.com/docs/extensions/reference/contextMenus/#event-onClicked
function onMenuItemClicked(clickedData, tab) {
  const converterIndex = parseInt(clickedData.menuItemId, 10)
  const converterCommand = storageCache.converters[converterIndex]
  pandoc(converterCommand, { tabId: tab.id, frameIds: [clickedData.frameId] }, clickedData)
}

// Handles long-lived connections.
// Uses the channel name to distinguish different types of connections.
// Reference: https://developer.chrome.com/docs/extensions/mv3/messaging/#connect
function onConnect(port) {
  switch (port.name) {
    case 'options':
      optionsWorker.onConnect(port)
      break
    default:
      port.postMessage({ type: 'error', message: `Unknown type of connection: ${port.name}` })
  }
}

// Configure Pandoc.
// Reference: https://developer.chrome.com/docs/extensions/reference/storage/#asynchronous-preload-from-storage
chrome.storage.sync.get(options => Object.assign(storageCache, options))

// Set up listeners.
// Reference: https://developer.chrome.com/docs/extensions/mv3/service_workers/#listeners
chrome.runtime.onInstalled.addListener(onInstalled)
chrome.storage.onChanged.addListener(onOptionsChange)
chrome.action.onClicked.addListener(onAction)
chrome.contextMenus.onClicked.addListener(onMenuItemClicked)
chrome.runtime.onConnect.addListener(onConnect)
