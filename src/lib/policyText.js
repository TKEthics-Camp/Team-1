// The Privacy Policy and Terms, in both languages, as the single place they
// exist. Rendered by PolicyScreen and linked from signup, from Me, and from
// the guardian consent page — Apple 5.1.1(i) requires a policy reachable
// inside the app, and a guardian being asked to agree to data handling has
// to be able to read what they are agreeing to.
//
// ─────────────────────────────────────────────────────────────────────────
// THIS IS A DRAFT AND HAS NOT BEEN REVIEWED BY A LAWYER.
//
// What it says about the app is accurate: every claim below was checked
// against the schema, the RLS policies and the code, and is true of the
// build it ships with. What it is NOT is legal advice, and the wording that
// makes a privacy policy binding — jurisdiction, the controller's legal
// identity, the lawful basis under GDPR, the exact COPPA disclosures — is
// not something this file can settle. Before real children use this, a
// lawyer has to read it.
//
// Bump the version in policyVersions.js on any change that alters what is
// collected, who can see it, or how long it is kept. Consent records keep
// the version they were taken under, which is the point of versioning it.
// ─────────────────────────────────────────────────────────────────────────

export const PRIVACY = {
  title: ["Privacy Policy", "隐私政策"],
  sections: [
    {
      h: ["The short version", "简要说明"],
      p: [
        [
          "Forest is a place to keep track of hobbies. It holds what you write, the photos you take and the voice notes you record. By default nobody else can see any of it. You choose, item by item, whether something is shared — and some accounts cannot share at all.",
          "Forest 是一个记录爱好的地方。它会保存你写下的内容、拍摄的照片和录制的语音。默认情况下，这些内容其他人都看不到。你可以逐条选择是否分享 —— 有些账号则完全无法分享。",
        ],
        [
          "We do not sell anything, show advertisements, or use any third-party analytics. There is no tracking in this app.",
          "我们不出售任何数据，不展示广告，也不使用任何第三方分析工具。这个应用没有任何追踪。",
        ],
      ],
    },
    {
      h: ["What is collected", "收集哪些信息"],
      p: [
        [
          "A username you choose. It does not have to be your real name, and we recommend it is not.",
          "你自己选择的用户名。它不必是你的真实姓名，我们也建议不要使用真实姓名。",
        ],
        [
          "A password. It is stored as a cryptographic hash and cannot be read back by anyone, including us.",
          "密码。它以加密哈希的形式存储，任何人都无法读取，包括我们。",
        ],
        [
          "Your date of birth, used only to work out which privacy rules apply to your account. It is not shown to anyone.",
          "你的出生日期，仅用于判断哪些隐私规则适用于你的账号。不会向任何人展示。",
        ],
        [
          "The hobbies you add, the journal entries you write, the photos you take, and the voice notes you record.",
          "你添加的爱好、写下的日记、拍摄的照片和录制的语音。",
        ],
        [
          "Settings: your avatar, colour theme, language, and whether sound is on.",
          "设置：你的头像、配色主题、语言，以及是否开启音效。",
        ],
        [
          "A class code, if a teacher gave you one and you entered it.",
          "班级代码（如果老师给了你，并且你填写了）。",
        ],
        [
          "A parent or guardian's email address, only for accounts that need guardian permission, and only to ask for that permission.",
          "父母或监护人的电子邮箱，仅用于需要监护人同意的账号，且仅用于征求该同意。",
        ],
      ],
    },
    {
      h: ["What is not collected", "不收集哪些信息"],
      p: [
        [
          "No email address is required to sign up as a student. No real name. No phone number. No address.",
          "学生注册不需要电子邮箱，不需要真实姓名、电话号码或住址。",
        ],
        [
          "No location. Photographs are re-encoded when you add them, which removes the hidden location and camera information a phone normally stores inside an image file.",
          "不收集位置信息。照片在添加时会被重新编码，这会移除手机通常存储在图片文件中的隐藏位置和相机信息。",
        ],
        [
          "No advertising identifiers, no analytics, no third-party software development kits of any kind.",
          "没有广告标识符，没有分析工具，也没有任何第三方软件开发工具包。",
        ],
      ],
    },
    {
      h: ["Who can see what you make", "谁能看到你创作的内容"],
      p: [
        [
          "Everything is private unless you change it. A private entry or photo is readable by you and by nobody else — this is enforced by the database itself, not by a setting in the app.",
          "除非你主动更改，否则所有内容都是私密的。私密的日记或照片只有你自己能看到 —— 这由数据库本身强制执行，而不是靠应用里的某个开关。",
        ],
        [
          "If you mark something public, it can be seen by other people who use Forest, and you can additionally choose to put it in the Community feed.",
          "如果你将某项内容设为公开，其他使用 Forest 的人就能看到；你还可以另外选择把它放进社区动态。",
        ],
        [
          "If you join a class, your classmates and your teacher can see your public hobbies and entries.",
          "如果你加入了班级，同学和老师可以看到你公开的爱好和日记。",
        ],
        [
          "If you block someone, neither of you can see the other's work, in either direction.",
          "如果你屏蔽了某人，你们双方都无法看到对方的内容，双向生效。",
        ],
        [
          "Some accounts — those set up with a guardian's permission under the no-sharing rules — can never share anything at all. On those accounts the sharing options do not exist.",
          "有些账号 —— 即在「不分享」规则下经监护人同意设立的账号 —— 永远无法分享任何内容。这些账号上不存在分享选项。",
        ],
      ],
    },
    {
      h: ["Where it is kept", "存储在哪里"],
      p: [
        [
          "On your own device, so the app works without a connection, and on servers run by Supabase, which provides the database and file storage.",
          "存储在你自己的设备上（因此没有网络也能使用），以及由 Supabase 运营的服务器上，它提供数据库和文件存储服务。",
        ],
        [
          "If you sign out on a shared computer, the copy on that device is erased.",
          "如果你在共用电脑上退出登录，该设备上的副本会被清除。",
        ],
      ],
    },
    {
      h: ["Deleting your account", "删除你的账号"],
      p: [
        [
          "Me → Delete my account removes everything: your account, your hobbies, entries, photos and voice notes, on your device and on the server. It cannot be undone and we cannot recover it afterwards.",
          "「我的」→「删除我的账号」会清除所有内容：你的账号、爱好、日记、照片和语音，设备上和服务器上的都会删除。此操作无法撤销，之后我们也无法恢复。",
        ],
        [
          "There is currently no way to download a copy of your data before deleting it. We know this is a gap and intend to fix it.",
          "目前还无法在删除前下载你的数据副本。我们知道这是一个缺口，并打算修复它。",
        ],
      ],
    },
    {
      h: ["Reporting something", "举报内容"],
      p: [
        [
          "If you see something that should not be there, use the ⋯ menu to report it. Reports are read by a person, who can hide the content. Hidden content stays visible to whoever made it and to nobody else.",
          "如果你看到不该出现的内容，请使用 ⋯ 菜单举报。举报会由专人查看，该人员可以隐藏相关内容。被隐藏的内容仍然只对创作者本人可见。",
        ],
      ],
    },
  ],
};

export const TERMS = {
  title: ["Terms of Use", "使用条款"],
  sections: [
    {
      h: ["Using Forest", "使用 Forest"],
      p: [
        [
          "Forest is for keeping track of hobbies you do away from a screen. You are welcome to use it for that.",
          "Forest 用于记录你在屏幕之外从事的爱好。欢迎你用它来做这件事。",
        ],
        [
          "If you are under 14 and not part of a class, a parent or guardian has to give permission before your account starts working.",
          "如果你未满 14 岁且不属于任何班级，需要父母或监护人同意后，你的账号才能开始使用。",
        ],
      ],
    },
    {
      h: ["What you may not do", "不可以做的事"],
      p: [
        [
          "Do not post anything that bullies, threatens, insults or humiliates another person.",
          "不要发布任何欺凌、威胁、侮辱或羞辱他人的内容。",
        ],
        [
          "Do not post anything sexual, violent, or otherwise unsuitable for the children who use this app.",
          "不要发布任何色情、暴力，或其他不适合使用本应用的儿童的内容。",
        ],
        [
          "Do not post other people's photographs or writing as your own.",
          "不要把他人的照片或文字当作自己的内容发布。",
        ],
        [
          "Do not share your own or anybody else's address, phone number, school or other contact details.",
          "不要分享你自己或他人的住址、电话号码、学校或其他联系方式。",
        ],
      ],
    },
    {
      h: ["What happens if you do", "违反后果"],
      p: [
        [
          "Content that breaks these rules can be hidden. An account used repeatedly to break them can be closed. Your own work stays visible to you either way.",
          "违反这些规则的内容可能会被隐藏。反复违规的账号可能会被关闭。无论哪种情况，你自己的内容对你本人仍然可见。",
        ],
      ],
    },
    {
      h: ["What we do not promise", "我们不作出的承诺"],
      p: [
        [
          "Forest is provided as it is. We try to keep it working and to keep what you make safe, but we cannot promise it will never lose data or never be unavailable. Keep anything you would be upset to lose somewhere else as well.",
          "Forest 按现状提供。我们会尽力保持其正常运行并保护你的内容，但无法承诺永远不会丢失数据或永远不会中断服务。对于丢失会让你难过的内容，请另外备份一份。",
        ],
      ],
    },
  ],
};
