package advisor

import "encoding/json"

const fillInstruction = `
РЕЖИМ ЗАПОЛНЕНИЯ. Верни только JSON: {"reply":"короткая живая реплика до 70 слов", "character":{"appearance":{"displayName":"...","pronouns":"...","appearance":"...","story":"...","motivation":"...","personality":["..."]},"raceId":"ID каталога","classId":"ID каталога","skills":[{"name":"...","description":"...","profileId":"ID профиля","modifierStat":"разрешённая характеристика"}],"equipment":[{"name":"...","description":"..."}]}}.
Собери полную анкету под пожелания из сообщения и беседы. Сохрани выбранные имя/расу/класс и задумку, если игрок не просит их поменять. До 5 коротких черт, 3 навыков суммарно не дороже skillBudget, до 8 обычных предметов без числовых бонусов. История 2–3 предложения, остальные описания по одному. Не передавай HP/AC, характеристики, цены, кубики, заряды, ID предметов, изображения или неизвестные поля: сервер добавит утверждённые значения. Если задумки мало — предложи цельный оригинальный образ, не запрашивай длинную анкету.`

func (p *Prompt) classContext(id string) string {
	for _, cl := range p.catalog.Rules.ClassProfiles {
		if cl.ID != id {
			continue
		}
		raw, err := json.Marshal(struct {
			Foundation map[string]int `json:"baseStats"`
			PointBuy   any            `json:"pointBuy"`
			Derived    any            `json:"derivedStats"`
			HP         int            `json:"baseHp"`
			AC         int            `json:"baseAc"`
			Cap        int            `json:"dexterityAcCap"`
		}{cl.BaseStats, p.catalog.Rules.PointBuy, p.catalog.Rules.DerivedStats, cl.BaseHP, cl.BaseAC, cl.DexterityACCap})
		if err == nil {
			return "\nПравила выбранного класса: " + string(raw)
		}
	}
	return ""
}
