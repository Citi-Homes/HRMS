from __future__ import annotations

from datetime import date, timedelta
from numbers import Integral, Real

import pandas as pd
import streamlit as st

from config import DESIGNATIONS, EMPLOYMENT_TYPES, VISA_STATUS
from database import execute, fetch_df, reset_table
from modules.components import download_excel_button, hero, section, status_badge


EMPLOYEE_COLUMNS = [
    "employee_id",
    "name",
    "department",
    "designation",
    "nationality",
    "joining_date",
    "employment_type",
    "visa_status",
    "emirates_id_expiry",
    "passport_expiry",
    "mobile",
    "emergency_contact",
    "status",
]
DEPARTMENT_FILTERS = ["All", "Operations", "P&C and Administration", "Procurement"]
ADD_DEPARTMENTS = ["Operations", "P&C and Administration", "Procurement"]
EMPLOYEE_STATUSES = ["Active", "Probation", "Inactive", "Resigned", "Terminated"]


def _department_group(department: object) -> str:
    value = str(department or "").strip()
    if value in {"P&C", "Administration", "P&C and Administration"}:
        return "P&C and Administration"
    if value == "Procurement":
        return "Procurement"
    return "Operations"


def _date_series(values: pd.Series) -> pd.Series:
    return pd.to_datetime(values, errors="coerce").dt.date


def _expiring_documents_count(df: pd.DataFrame) -> int:
    if df.empty:
        return 0
    today = date.today()
    limit = today + timedelta(days=60)
    expiry_dates = pd.concat(
        [
            _date_series(df.get("emirates_id_expiry", pd.Series(dtype=object))),
            _date_series(df.get("passport_expiry", pd.Series(dtype=object))),
        ],
        ignore_index=True,
    ).dropna()
    return int(((expiry_dates >= today) & (expiry_dates <= limit)).sum())


def _new_joiners_count(df: pd.DataFrame) -> int:
    if df.empty or "joining_date" not in df.columns:
        return 0
    today = date.today()
    since = today - timedelta(days=30)
    joining_dates = _date_series(df["joining_date"]).dropna()
    return int(((joining_dates >= since) & (joining_dates <= today)).sum())


def _employee_kpi(label: str, value: object, sub: str = "") -> str:
    return f"""
    <div class="employee-kpi-card">
        <div class="employee-kpi-label">{label}</div>
        <div class="employee-kpi-value">{value}</div>
        <div class="employee-kpi-sub">{sub}</div>
    </div>
    """


def _show_summary(df: pd.DataFrame) -> None:
    active = int((df["status"] == "Active").sum()) if not df.empty and "status" in df.columns else 0
    probation = int((df["status"] == "Probation").sum()) if not df.empty and "status" in df.columns else 0
    items = [
        ("Total Employees", len(df), "Complete master records"),
        ("Active Employees", active, "Currently in service"),
        ("On Probation", probation, "Probationary team members"),
        ("Documents Expiring", _expiring_documents_count(df), "Next 60 days"),
        ("New Joiners", _new_joiners_count(df), "Last 30 days"),
    ]
    columns = st.columns(5)
    for column, item in zip(columns, items):
        with column:
            st.markdown(_employee_kpi(*item), unsafe_allow_html=True)


def _filtered_employees(df: pd.DataFrame, department_filter: str, search: str, status_filter: str) -> pd.DataFrame:
    if df.empty:
        return df.copy()

    filtered = df.copy()
    filtered["department_group"] = filtered["department"].apply(_department_group)

    if department_filter != "All":
        filtered = filtered[filtered["department_group"] == department_filter]

    if status_filter != "All" and "status" in filtered.columns:
        filtered = filtered[filtered["status"] == status_filter]

    if search:
        needle = search.strip().casefold()
        search_columns = ["employee_id", "name", "department", "designation", "mobile", "nationality"]
        mask = pd.Series(False, index=filtered.index)
        for column in search_columns:
            if column in filtered.columns:
                mask = mask | filtered[column].fillna("").astype(str).str.casefold().str.contains(needle, regex=False)
        filtered = filtered[mask]

    return filtered.drop(columns=["department_group"], errors="ignore")


def _employee_profile(row: pd.Series | None) -> None:
    st.markdown('<div class="employee-profile-card">', unsafe_allow_html=True)
    if row is None:
        st.markdown(
            """
            <div class="employee-profile-empty">
                <div class="profile-eyebrow">Profile Preview</div>
                <h3>Select an employee</h3>
                <p>Choose a record from the focus list to see key contact, role and document details.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        st.markdown("</div>", unsafe_allow_html=True)
        return

    status = str(row.get("status", "Active") or "Active")
    st.markdown(
        f"""
        <div class="profile-eyebrow">Employee Profile</div>
        <h3>{row.get("name", "")}</h3>
        <div class="profile-muted">{row.get("employee_id", "")} · {row.get("designation", "")}</div>
        <div class="profile-badge-row">{status_badge(status)}</div>
        <div class="profile-grid">
            <div><span>Department</span><strong>{row.get("department", "")}</strong></div>
            <div><span>Joining Date</span><strong>{row.get("joining_date", "")}</strong></div>
            <div><span>Visa Status</span><strong>{row.get("visa_status", "")}</strong></div>
            <div><span>Mobile</span><strong>{row.get("mobile", "")}</strong></div>
            <div><span>Emirates ID Expiry</span><strong>{row.get("emirates_id_expiry", "")}</strong></div>
            <div><span>Passport Expiry</span><strong>{row.get("passport_expiry", "")}</strong></div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("</div>", unsafe_allow_html=True)


def _merge_edited_rows(source: pd.DataFrame, filtered: pd.DataFrame, edited: pd.DataFrame) -> pd.DataFrame:
    merged = source.copy()
    edited_clean = edited.drop(columns=["Sr. No"], errors="ignore")

    existing_ids = set(merged["id"].dropna().astype(int).tolist()) if "id" in merged.columns else set()
    for index, row in edited_clean.iterrows():
        row_data = row.to_dict()
        if index in existing_ids:
            for column, value in row_data.items():
                if column in EMPLOYEE_COLUMNS:
                    merged.loc[merged["id"] == index, column] = value
        elif any(str(value or "").strip() for value in row_data.values()):
            new_row = {column: row_data.get(column) for column in EMPLOYEE_COLUMNS}
            merged = pd.concat([merged, pd.DataFrame([new_row])], ignore_index=True)

    removed_ids = set(filtered["id"].dropna().astype(int).tolist()) - {
        int(index) for index in edited_clean.index if isinstance(index, (Integral, Real)) and not pd.isna(index)
    }
    if removed_ids and "id" in merged.columns:
        merged = merged[~merged["id"].isin(removed_ids)]

    return merged


def _employee_table(df: pd.DataFrame, filtered: pd.DataFrame) -> None:
    section("Employee Master Table")
    if filtered.empty:
        st.info("No employees match the selected filters.")
        return

    editor_df = filtered.copy()
    editor_df = editor_df[[column for column in ["id", *EMPLOYEE_COLUMNS] if column in editor_df.columns]]
    editor_df.insert(0, "Sr. No", range(1, len(editor_df) + 1))
    if "id" in editor_df.columns:
        editor_df = editor_df.set_index("id", drop=True)

    edited = st.data_editor(
        editor_df,
        width="stretch",
        hide_index=True,
        num_rows="dynamic",
        key="employees_master_table",
        disabled=["Sr. No"],
        column_config={
            "Sr. No": st.column_config.NumberColumn("Sr. No"),
            "department": st.column_config.SelectboxColumn(
                "Department",
                options=ADD_DEPARTMENTS,
            ),
            "status": st.column_config.SelectboxColumn(
                "Status",
                options=EMPLOYEE_STATUSES,
            ),
            "employment_type": st.column_config.SelectboxColumn(
                "Employment Type",
                options=EMPLOYMENT_TYPES,
            ),
            "visa_status": st.column_config.SelectboxColumn(
                "Visa Status",
                options=VISA_STATUS,
            ),
        },
    )

    c1, c2 = st.columns([1, 4])
    with c1:
        if st.button("Save Changes", key="save_employees_master_table", width="stretch"):
            reset_table("employees", _merge_edited_rows(df, filtered, edited))
            st.success("Employee master updated successfully.")
            st.rerun()
    with c2:
        download_excel_button(edited.reset_index(drop=True), "employees.xlsx", "Export filtered table")


def show() -> None:
    hero(
        "Employee Master",
        "Central People & Culture database for Citi Homes employees, document status, contact details and department control.",
    )

    df = fetch_df("SELECT * FROM employees")

    section("Employee Summary")
    _show_summary(df)

    section("Employee Control Panel")
    st.markdown('<div class="employee-filter-panel">', unsafe_allow_html=True)
    department_filter = st.radio(
        "Department View",
        DEPARTMENT_FILTERS,
        horizontal=True,
        label_visibility="collapsed",
        key="employee_department_filter",
    )
    c1, c2 = st.columns([2.4, 1])
    search = c1.text_input("Search employees", placeholder="Search name, code, designation, mobile...")
    status_options = ["All"] + sorted(df["status"].dropna().unique().tolist()) if not df.empty and "status" in df.columns else ["All"]
    status_filter = c2.selectbox("Status", status_options)
    st.markdown("</div>", unsafe_allow_html=True)

    filtered = _filtered_employees(df, department_filter, search, status_filter)

    table_col, profile_col = st.columns([2.35, 1], gap="large")
    with table_col:
        _employee_table(df, filtered)
    with profile_col:
        section("Focused Employee")
        selected_row = None
        if not filtered.empty:
            labels = filtered.apply(
                lambda row: f"{row.get('employee_id', '')} - {row.get('name', '')}",
                axis=1,
            ).tolist()
            selected = st.selectbox("Profile focus", labels, label_visibility="collapsed")
            selected_index = labels.index(selected)
            selected_row = filtered.iloc[selected_index]
        _employee_profile(selected_row)

    section("Add New Employee")
    with st.expander("Add New Employee", expanded=False):
        with st.form("employee_form", clear_on_submit=True):
            c1, c2, c3 = st.columns(3)
            employee_id = c1.text_input("Employee ID", placeholder="CH001")
            name = c2.text_input("Employee Name")
            department = c3.selectbox("Department", ADD_DEPARTMENTS)
            designation = c1.selectbox("Designation", DESIGNATIONS)
            nationality = c2.text_input("Nationality")
            joining_date = c3.date_input("Joining Date")
            employment_type = c1.selectbox("Employment Type", EMPLOYMENT_TYPES)
            visa_status = c2.selectbox("Visa Status", VISA_STATUS)
            status = c3.selectbox("Employee Status", EMPLOYEE_STATUSES)
            emirates_id_expiry = c1.date_input("Emirates ID Expiry")
            passport_expiry = c2.date_input("Passport Expiry")
            mobile = c3.text_input("Mobile")
            emergency_contact = st.text_input("Emergency Contact")
            submit = st.form_submit_button("Save Employee", width="stretch")
            if submit:
                if not employee_id or not name:
                    st.error("Employee ID and Employee Name are required.")
                else:
                    try:
                        execute(
                            """
                            INSERT INTO employees(employee_id, name, department, designation, nationality, joining_date, employment_type, visa_status, emirates_id_expiry, passport_expiry, mobile, emergency_contact, status)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                employee_id,
                                name,
                                department,
                                designation,
                                nationality,
                                str(joining_date),
                                employment_type,
                                visa_status,
                                str(emirates_id_expiry),
                                str(passport_expiry),
                                mobile,
                                emergency_contact,
                                status,
                            ),
                        )
                        st.success("Employee saved successfully.")
                        st.rerun()
                    except Exception as exc:
                        st.error(f"Could not save employee: {exc}")
