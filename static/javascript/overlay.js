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

async function get_author_stats(author_email) {
    return fetch(`/${DATABASE_NAME}/query/filesChangeMostByAuthor?`
        + new URLSearchParams(author_email)
    ).then(response => response.json())
}

const FIELD_TO_FUNCTION = new Map([
    ["File path", update_info_box_with_file_stats],
    ["Author email", update_info_box_with_author_stats]
])

function sql_repsonse_to_table(r) {
    let column_map = new Map()
    const m = r.length
    if (!m) return
    const table = document.createElement("table")
    const thead = document.createElement("thead")
    const tr_head = document.createElement("tr")
    r[0].forEach((column_name, index) => {
        if (FIELD_TO_FUNCTION.has(column_name)) {
            column_map.set(index, column_name)
        }
        const td = document.createElement("td")
        const text = document.createTextNode(column_name)
        td.appendChild(text)
        tr_head.appendChild(td)
    })
    thead.appendChild(tr_head)
    table.appendChild(thead)
    const tbody = document.createElement("tbody")
    r.forEach((row, index) => {
        if (index == 0) return
        const tr = document.createElement("tr")
        row.forEach((val, column) => {
            const td = document.createElement("td")
            const text = document.createTextNode(val)
            if (column_map.has(column)) {
                const button = document.createElement("button")
                button.classList.add("link_button")
                button.value = val
                button.onclick = () => {
                    FIELD_TO_FUNCTION.get(column_map.get(column))(button.value)
                }
                td.appendChild(button)
                button.appendChild(text)
            } else {
                td.appendChild(text)
            }
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

async function update_info_box_with_author_stats(author_email) {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Files changed most by author"))
    const h2 = document.createElement("h2")
    h2.appendChild(document.createTextNode(author_email))
    const table = sql_repsonse_to_table(await get_author_stats(author_email))
    set_info_content(h1, h2, table)
}
