from logic import Project, Task
import datetime

def get_template_1(start_date: datetime.date) -> Project:
    p = Project(name="Standard Sell-Side M&A", start_date=start_date)
    
    # Phase 1: Preparation
    p.add_task(Task(id="T1.1", name="Kick-off & Information Gathering", phase="Phase 1: Preparation", duration_weeks=2.0))
    p.add_task(Task(id="T1.2", name="Preparation of Teaser & Information Memorandum (IM)", phase="Phase 1: Preparation", duration_weeks=4.0, predecessors=["T1.1"]))
    p.add_task(Task(id="T1.3", name="Structuring of Virtual Data Room (VDR)", phase="Phase 1: Preparation", duration_weeks=3.0, predecessors=["T1.1"]))
    
    # Phase 2: Marketing
    p.add_task(Task(id="T2.1", name="Contact with Potential Investors & NDAs", phase="Phase 2: Marketing", duration_weeks=3.0, predecessors=["T1.2"]))
    p.add_task(Task(id="T2.2", name="Distribution of IM & Process Letter I", phase="Phase 2: Marketing", duration_weeks=1.0, predecessors=["T2.1"], task_type="Milestone"))
    p.add_task(Task(id="T2.3", name="Reception & Evaluation of Non-Binding Offers (NBOs)", phase="Phase 2: Marketing", duration_weeks=2.0, predecessors=["T2.2"], task_type="Key Decision"))
    
    # Phase 3: Due Diligence & Exclusivity
    p.add_task(Task(id="T3.1", name="VDR Access & Confirmatory Due Diligence", phase="Phase 3: Due Diligence & Exclusivity", duration_weeks=6.0, predecessors=["T2.3"]))
    p.add_task(Task(id="T3.2", name="Management Presentations & Site Visits", phase="Phase 3: Due Diligence & Exclusivity", duration_weeks=2.0, predecessors=["T2.3"], task_type="Bottleneck"))
    p.add_task(Task(id="T3.3", name="Sharing of SPA Drafts & Legal Terms", phase="Phase 3: Due Diligence & Exclusivity", duration_weeks=1.0, predecessors=["T3.1"]))
    p.add_task(Task(id="T3.4", name="Reception of Binding Offers (BOs) & SPA Mark-up", phase="Phase 3: Due Diligence & Exclusivity", duration_weeks=2.0, predecessors=["T3.1"], task_type="Key Decision"))

    # Phase 4: Conclusion
    p.add_task(Task(id="T4.1", name="Final Negotiation with Selected Investor", phase="Phase 4: Conclusion", duration_weeks=3.0, predecessors=["T3.4"]))
    p.add_task(Task(id="T4.2", name="Finalization of Legal Docs & SPA Signature / Closing", phase="Phase 4: Conclusion", duration_weeks=1.0, predecessors=["T4.1"], task_type="Milestone"))
    
    p.calculate_schedule()
    return p

def get_template_2(start_date: datetime.date) -> Project:
    p = Project(name="Fast-Track / Sprint M&A", start_date=start_date)
    
    # Phase 1: Accelerated Prep & Marketing
    p.add_task(Task(id="F1.1", name="Teaser, VDR Setup & Initial Contacts", phase="Phase 1: Accelerated Prep & Marketing", duration_weeks=3.0))
    p.add_task(Task(id="F1.2", name="IM Distribution & Fast-track NDAs", phase="Phase 1: Accelerated Prep & Marketing", duration_weeks=2.0, predecessors=["F1.1"]))
    p.add_task(Task(id="F1.3", name="Reception of NBOs", phase="Phase 1: Accelerated Prep & Marketing", duration_weeks=1.0, predecessors=["F1.2"], task_type="Key Decision"))
    
    # Phase 2: Deep Dive & Closing
    p.add_task(Task(id="F2.1", name="Intensive DD & Q&A", phase="Phase 2: Deep Dive & Closing", duration_weeks=4.0, predecessors=["F1.3"]))
    p.add_task(Task(id="F2.2", name="Management Presentations", phase="Phase 2: Deep Dive & Closing", duration_weeks=1.0, predecessors=["F1.3"], task_type="Bottleneck"))
    p.add_task(Task(id="F2.3", name="Binding Offers & SPA Negotiation", phase="Phase 2: Deep Dive & Closing", duration_weeks=2.0, predecessors=["F2.1"], task_type="Key Decision"))
    p.add_task(Task(id="F2.4", name="Closing", phase="Phase 2: Deep Dive & Closing", duration_weeks=1.0, predecessors=["F2.3"], task_type="Milestone"))
    
    p.calculate_schedule()
    return p

def get_template_3(start_date: datetime.date) -> Project:
    p = Project(name="Due Diligence Heavy / Buy-Side", start_date=start_date)
    
    # Phase 1: DD Kick-off
    p.add_task(Task(id="D1.1", name="Kick-off Meetings for DDs (Financial, Tax, Legal)", phase="Phase 1: DD Kick-off", duration_weeks=1.0))
    p.add_task(Task(id="D1.2", name="Data Room Opening & Info Processing", phase="Phase 1: DD Kick-off", duration_weeks=2.0, predecessors=["D1.1"]))
    
    # Phase 2: Execution & Q&A
    p.add_task(Task(id="D2.1", name="Expert Sessions & Q&A with Key People", phase="Phase 2: Execution & Q&A", duration_weeks=3.0, predecessors=["D1.2"]))
    p.add_task(Task(id="D2.2", name="Confirmatory DD Execution", phase="Phase 2: Execution & Q&A", duration_weeks=5.0, predecessors=["D1.2"]))
    
    # Phase 3: Legal & Conclusion
    p.add_task(Task(id="D3.1", name="SPA Draft Sharing", phase="Phase 3: Legal & Conclusion", duration_weeks=1.0, predecessors=["D2.2"]))
    p.add_task(Task(id="D3.2", name="Evaluation of BOs & SPA Mark-up", phase="Phase 3: Legal & Conclusion", duration_weeks=2.0, predecessors=["D3.1"], task_type="Key Decision"))
    p.add_task(Task(id="D3.3", name="Final Negotiation & Closing", phase="Phase 3: Legal & Conclusion", duration_weeks=2.0, predecessors=["D3.2"], task_type="Milestone"))
    
    p.calculate_schedule()
    return p

def get_project_by_template_name(name: str, start_date: datetime.date) -> Project:
    if "Standard" in name:
        return get_template_1(start_date)
    elif "Fast-Track" in name:
        return get_template_2(start_date)
    elif "Buy-Side" in name:
        return get_template_3(start_date)
    else:
        return get_template_1(start_date)
