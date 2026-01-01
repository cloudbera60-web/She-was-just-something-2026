[file name]: menu.js (FIXED)

[file content begin]

const { sendButtons } = require('gifted-btns');

const moment = require('moment-timezone');

module.exports = async (m, sock) => {

  const prefix = process.env.BOT_PREFIX || '.';

  const cmd = m.body.startsWith(prefix) ? m.body.slice(prefix.length).split(" ")[0].toLowerCase() : "";

  

  const validCommands = ['menu', 'help', 'start', 'list'];

  

  if (validCommands.includes(cmd)) {

    try {

      // Get time-based greeting

      const nairobiTime = moment().tz("Africa/Nairobi");

      const currentHour = nairobiTime.hour();

      

      let greeting = "";

      let greetingEmoji = "";

      

      if (currentHour < 5) {

        greeting = "Late Night Serenity";

        greetingEmoji = "ðŸŒ™âœ¨";

      } else if (currentHour < 12) {

        greeting = "Morning Precision";

        greetingEmoji = "â˜€ï¸âš¡";

      } else if (currentHour < 17) {

        greeting = "Afternoon Efficiency";

        greetingEmoji = "â›…ðŸš€";

      } else if (currentHour < 21) {

        greeting = "Evening Excellence";

        greetingEmoji = "ðŸŒ‡ðŸŒŸ";

      } else {

        greeting = "Night Innovation";

        greetingEmoji = "ðŸŒŒðŸ’«";

      }

      

      const formattedTime = nairobiTime.format('h:mm A');

      const formattedDate = nairobiTime.format('ddd, MMM D');

      

      // Create menu text

      const menuText = `â•­â”€â”€â”€ã€Œ *CLOUD AI* ã€â”€â”€â”€â•®

â”‚

â”‚   ${greetingEmoji} *${greeting}*, ${m.pushName}!

â”‚   ðŸ“… ${formattedDate} â”‚ ðŸ• ${formattedTime} (EAT)

â”‚

â”‚   â”Œâ”€ã€Œ *Quick Stats* ã€

â”‚   â”‚  â€¢ User: @${m.sender.split('@')[0]}

â”‚   â”‚  â€¢ Prefix: ${prefix}

â”‚   â”‚  â€¢ Status: âœ… Operational

â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

â”‚

â”‚   *Select a module below:*

â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯`;

      // Send premium button menu

      await sendButtons(sock, m.from, {

        title: 'â˜ï¸ CLOUD AI | Professional Suite',

        text: menuText,

        footer: `Powered by BERA TECH | Â© ${new Date().getFullYear()} | v4.0.0`,

        buttons: [

          { id: 'btn_core_ping', text: 'âš¡ Ping Test' },

          { id: 'btn_tools_vcf', text: 'ðŸ“‡ Export Tools' },

          { id: 'btn_group_tagall', text: 'ðŸ·ï¸ Group Manager' },

          { id: 'btn_music_play', text: 'ðŸŽµ Music Center' },

          { id: 'btn_logo_menu', text: 'ðŸŽ¨ Logo Maker' },

          { id: 'btn_url', text: 'ðŸŒ Media Upload' }

        ]

      });

      

      console.log(`âœ… Premium menu sent to ${m.sender}`);

      

    } catch (error) {

      console.error('âŒ Menu Error:', error);

      

      // Fallback

      const fallbackMenu = `

â•­â”€â”€â”€ã€Œ â˜ï¸ *CLOUD AI* ã€â”€â”€â”€â•®

â”‚

â”‚   âš¡ *Premium Features*

â”‚

â”‚   â”Œâ”€ã€Œ Core Modules ã€

â”‚   â”‚  â€¢ ${prefix}ping - System Performance

â”‚   â”‚  â€¢ ${prefix}owner - Owner Contact

â”‚   â”‚  â€¢ ${prefix}play - Music Downloader

â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

â”‚

â”‚   â”Œâ”€ã€Œ Group Tools ã€

â”‚   â”‚  â€¢ ${prefix}vcf - Contact Exporter

â”‚   â”‚  â€¢ ${prefix}tagall - Member Manager

â”‚   â”‚  â€¢ ${prefix}url - Media Uploader

â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

â”‚

â”‚   â”Œâ”€ã€Œ Creative ã€

â”‚   â”‚  â€¢ ${prefix}logo - Logo Generator

â”‚   â”‚  â€¢ ${prefix}view - Media Viewer

â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

â”‚

â”‚   ðŸ“ *Professional WhatsApp Automation*

â”‚   ðŸ‘‘ BERA TECH | v4.0.0

â•°â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â•¯`;

      

      await sock.sendMessage(m.from, {

        text: fallbackMenu,

        contextInfo: {

          mentionedJid: [m.sender],

          forwardingScore: 999,

          isForwarded: true

        }

      }, { quoted: m });

    }

  }

  

  // Handle menu button

  if (m.body === 'btn_menu' || m.body === 'btn_menu_back') {

    m.body = '.menu';

    await module.exports(m, sock);

  }

};

[file content end]
