function open_overlay() {
    const overlay = document.getElementById('overlay');
    const info_box = document.getElementById('info_box');

    overlay.style.display = 'block';
    info_box.style.display = 'block';
}

function close_overlay() {
    const overlay = document.getElementById('overlay');
    const info_box = document.getElementById('info_box');

    overlay.style.display = 'none';
    info_box.style.display = 'none';
}

function set_info_content(...child_elements) {
    const info_box = document.getElementById('info_box');
    info_box.replaceChildren(...child_elements)
}

async function get_file_stats(path) {
    return fetch(`/${DATABASE_NAME}/query/rankAuthorsByLinesChangedInPath?`
        + new URLSearchParams(path)
    ).then(response => response.json())
}

function sql_repsonse_to_table(r) {
    const m = r.length
    if (!m) return
    const table = document.createElement("table")
    const thead = document.createElement("thead")
    const tr_head = document.createElement("tr")
    r[0].forEach((i) => {
        const td = document.createElement("td")
        const text = document.createTextNode(i)
        td.appendChild(text)
        tr_head.appendChild(td)
    })
    thead.appendChild(tr_head)
    table.appendChild(thead)

    const tbody = document.createElement("tbody")
    r.forEach((row, index) => {
        if (index == 0) return
        const tr = document.createElement("tr")
        row.forEach((i) => {
            const td = document.createElement("td")
            const text = document.createTextNode(i)
            td.appendChild(text)
            tr.appendChild(td)
        })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    table.classList.add("info_table")
    return table
}

async function update_info_box_with_file_stats(path) {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Author emails with most changes to"))
    const h2 = document.createElement("h2")
    h2.appendChild(document.createTextNode(path))
    const table = sql_repsonse_to_table(await get_file_stats(path))
    set_info_content(h1, h2, table)
}
