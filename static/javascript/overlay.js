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

async function get_author_stats(author_email) {
    return fetch(`/${DATABASE_NAME}/query/filesChangeMostByAuthor?`
        + new URLSearchParams(author_email)
    )
}

async function get_commit_stats(author_email) {
    return fetch(`/${DATABASE_NAME}/query/filesChangeMostByCommit?`
        + new URLSearchParams(author_email)
    )
}

async function get_file_stats(path) {
    return fetch(`/${DATABASE_NAME}/query/rankAuthorsByLinesChangedInPath?`
        + new URLSearchParams(path)
    )
}

async function get_file_commits(path) {
    return fetch(`/${DATABASE_NAME}/query/rankCommitsByLinesChangedForFile?`
        + new URLSearchParams(path)
    )
}

async function get_all_authors() {
    return fetch(`/${DATABASE_NAME}/query/rankAuthorsByLinesChanged`)
}

async function get_all_commits() {
    return fetch(`/${DATABASE_NAME}/query/rankCommitsByLinesChanged`)
}

async function get_all_files() {
    return fetch(`/${DATABASE_NAME}/query/rankFilesByLinesChanged`)
}

const FIELD_TO_FUNCTION = new Map([
    ["Author email", update_info_box_with_author_stats],
    ["Commit hash", update_info_box_with_commit_stats],
    ["File path", update_info_box_with_file_stats]
])

const FIELD_TO_FILTER = new Map([
    ["Author email", "email_filter"],
    ["Commit hash", "commit_filter"],
    ["File path", "filename_filter"]
])

function sql_response_to_table(r) {
    let column_func_map = new Map()
    let column_filter_list_map = new Map()
    const m = r.length
    if (!m) return
    const table = document.createElement("table")
    const thead = document.createElement("thead")
    const tr_head = document.createElement("tr")
    r[0].forEach((column_name, index) => {
        if (FIELD_TO_FUNCTION.has(column_name)) {
            column_func_map.set(index, column_name)
        }
        if (FIELD_TO_FILTER.has(column_name)) {
            const filter = document.getElementById(FIELD_TO_FILTER.get(column_name))
            if (filter) {
                const filter_list = filter.querySelector(".item_list")
                if (filter_list) column_filter_list_map.set(index, filter_list)
            }
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
            if (column_func_map.has(column)) {
                const button = document.createElement("button")
                button.classList.add("link_button")
                button.value = val
                button.onclick = () => {
                    FIELD_TO_FUNCTION.get(column_func_map.get(column))(button.value)
                }
                td.appendChild(button)
                button.appendChild(text)
            } else {
                td.appendChild(text)
            }
            if (column_filter_list_map.has(column)) {
                const button = document.createElement("button")
                button.classList.add("add_button")
                button.value = val
                button.onclick = () => {
                    column_filter_list_map.get(column).appendChild(make_list_item(button.value))
                }
                td.appendChild(button)
                button.appendChild(document.createTextNode("+"))
            }
            tr.appendChild(td)
        })
        tbody.appendChild(tr)
    })
    table.appendChild(tbody)
    table.classList.add("info_table")
    return table
}

function update_info_box_downloading() {
    set_info_content(document.createTextNode("Fetching data..."))
}

function update_info_box_rendering() {
    set_info_content(document.createTextNode("Rendering data..."))
}

async function update_info_box_with_author_stats(author_email) {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Files changed most by author"))
    const h2 = document.createElement("h2")
    h2.appendChild(document.createTextNode(author_email))
    update_info_box_downloading()
    const response = await get_author_stats(hash)
    update_info_box_rendering()
    const table = sql_response_to_table(await response.json())
    set_info_content(h1, h2, table)
}

async function update_info_box_with_commit_stats(hash) {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Files changed in commit"))
    const h2 = document.createElement("h2")
    h2.appendChild(document.createTextNode(hash))
    update_info_box_downloading()
    const response = await get_commit_stats(hash)
    update_info_box_rendering()
    const table = sql_response_to_table(await response.json())
    set_info_content(h1, h2, table)
}

async function update_info_box_with_file_stats(path) {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Author emails with most changes to"))
    const h2 = document.createElement("h2")
    h2.appendChild(document.createTextNode(path))
    update_info_box_downloading()
    const response = await get_file_stats(path)
    update_info_box_rendering()
    const table = sql_response_to_table(await response.json())
    set_info_content(h1, h2, table)
}

async function update_info_box_all_authors() {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Author emails sorted by most changes"))
    update_info_box_downloading()
    const response = await get_all_authors()
    update_info_box_rendering()
    const table = sql_response_to_table(await response.json())
    set_info_content(h1, table)
}

async function browse_authors() {
    update_info_box_all_authors()
    open_overlay()
}

async function update_info_box_all_commits() {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Commits sorted by most changes"))
    update_info_box_downloading()
    const response = await get_all_commits()
    update_info_box_rendering()
    const table = sql_response_to_table(await response.json())
    set_info_content(h1, table)
}

async function browse_commits() {
    update_info_box_all_commits()
    open_overlay()
}

async function update_info_box_all_files() {
    const h1 = document.createElement("h1")
    h1.appendChild(document.createTextNode("Files sorted by most changes"))
    update_info_box_downloading()
    const response = await get_all_files()
    update_info_box_rendering()
    const table = sql_response_to_table(await response.json())
    set_info_content(h1, table)
}

async function browse_files() {
    update_info_box_all_files()
    open_overlay()
}
