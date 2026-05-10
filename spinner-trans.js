export function showSpinner() {
    const spinner = document.getElementById('global-loading')
    if (spinner) {
        spinner.classList.remove('hidden')
    }
}

export function hideSpinner() {
    const spinner = document.getElementById('global-loading')
    if (spinner) {
        spinner.classList.add('hidden')
    

        setTimeout(function() {
            spinner.style.display = 'none'
        }, 400)
    }
}

export function initTransitions() {

    // Interceta todos os cliques em links <a>
    document.addEventListener("click", function(e) {

        // Verifica se o clique foi num link <a>
        const link = e.target.closest("a")

        // Se não foi num link, ignora
        if (!link) return

        const href = link.getAttribute("href")


        if (!href || href.startsWith("http") || href.startsWith("#")) return


        e.preventDefault()


        document.body.style.opacity    = "0"
        document.body.style.transform  = "translateY(-8px)"
        document.body.style.transition = "opacity 0.3s ease, transform 0.3s ease"

        setTimeout(function() {
            window.location.href = href
        }, 300)
    })
}

export function navigateTo(href) {
    document.body.style.opacity    = "0"
    document.body.style.transform  = "translateY(-8px)"
    document.body.style.transition = "opacity 0.3s ease, transform 0.3s ease"

    setTimeout(function() {
        window.location.href = href
    }, 300)
}