import designloading from './AntDesignLoading.svg'
const RefreshContainer = document.createElement('div')
RefreshContainer.className = 'refresh-container'
RefreshContainer.innerHTML
= `<div class="refresh-top"><img src="${designloading}" class="spinner" alt="loading"/>
</div><text id="text"></text>`
RefreshContainer.normalize()
export {
  RefreshContainer,
}
