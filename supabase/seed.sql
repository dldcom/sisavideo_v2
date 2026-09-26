insert into public.education_topics(name,slug,sort_order) values
('학교폭력 예방','school-violence',10),('교통안전','traffic-safety',20),
('생활안전','daily-safety',30),('재난안전','disaster-safety',40),
('약물·흡연·음주 예방','substance-prevention',50),('디지털 안전·디지털 시민교육','digital-safety',60),
('응급처치','first-aid',70),('성교육·성폭력 예방·양성평등','sexuality-equality',80),
('생명존중·마음건강','wellbeing',90),('아동 안전·아동권리·아동학대 예방','child-rights',100),
('장애이해·인권','disability-rights',110),('다문화 이해','multicultural',120),
('진로교육','career',130),('환경·지속가능발전','environment',140)
on conflict (slug) do update set name=excluded.name,sort_order=excluded.sort_order;

with children(parent_slug,name,slug,sort_order) as (values
('school-violence','언어폭력','school-verbal',10),('school-violence','따돌림','school-bullying',20),('school-violence','사이버폭력','school-cyber',30),('school-violence','방관자','school-bystander',40),('school-violence','갈등 해결','school-conflict',50),
('traffic-safety','보행안전','traffic-pedestrian',10),('traffic-safety','자전거 안전','traffic-bicycle',20),('traffic-safety','자동차 사각지대','traffic-blindspot',30),('traffic-safety','안전띠','traffic-seatbelt',40),('traffic-safety','통학버스','traffic-schoolbus',50),
('disaster-safety','화재','disaster-fire',10),('disaster-safety','지진','disaster-earthquake',20),('disaster-safety','태풍·홍수','disaster-storm-flood',30),('disaster-safety','폭염·한파','disaster-temperature',40),('disaster-safety','대피','disaster-evacuation',50),
('digital-safety','개인정보','digital-privacy',10),('digital-safety','사이버폭력','digital-cyber',20),('digital-safety','스마트폰 과의존','digital-smartphone',30),('digital-safety','게임 과의존','digital-gaming',40),('digital-safety','디지털 시민성','digital-citizenship',50)
)
insert into public.education_topics(parent_id,name,slug,sort_order)
select p.id,c.name,c.slug,c.sort_order from children c join public.education_topics p on p.slug=c.parent_slug
on conflict (slug) do update set parent_id=excluded.parent_id,name=excluded.name,sort_order=excluded.sort_order;
