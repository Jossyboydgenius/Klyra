# Klyra - Crypto Payment & Wallet Management Platform.

A comprehensive cryptocurrency payment and wallet management platform built with Next.js, TypeScript, and Supabase. Klyra enables users to buy, sell, send, and manage cryptocurrencies with a modern, intuitive interface.

## 🚀 Features

### Core Functionality
- **Multi-Cryptocurrency Support**: Bitcoin (BTC), Ethereum (ETH), BNB, USDT, USDC
- **Cross-Network Operations**: Support for Ethereum Mainnet, Base, and BSC networks
- **Real-time Price Tracking**: Live cryptocurrency prices and market data
- **Secure Authentication**: Supabase-powered user authentication and session management
- **KYC Integration**: Know Your Customer verification system
- **Payment Methods**: Multiple payment method management (cards, bank transfers)

### User Experience
- **Modern UI/UX**: Built with shadcn/ui components and Tailwind CSS
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Real-time Updates**: Live transaction status and balance updates
- **Intuitive Navigation**: Seamless flow between different operations

### Security & Compliance
- **Secure Authentication**: JWT-based authentication with Supabase
- **KYC Verification**: Identity verification for regulatory compliance
- **Transaction Security**: Secure crypto transactions with proper validation
- **Data Protection**: Encrypted data storage and transmission

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS with shadcn/ui components
- **State Management**: React hooks and context
- **Icons**: Lucide React

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **API**: Supabase Edge Functions with Hono
- **Storage**: Supabase Key-Value store

### Key Components
```
src/
├── app/                    # Next.js App Router
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── AuthScreen.tsx    # Authentication interface
│   ├── Dashboard.tsx     # Main dashboard
│   ├── BuyCrypto.tsx    # Crypto purchase flow
│   ├── SellCrypto.tsx   # Crypto sale flow
│   ├── SendCrypto.tsx   # Crypto transfer
│   ├── CryptoWallet.tsx # Wallet management
│   ├── KYCScreen.tsx    # KYC verification
│   └── PaymentMethods.tsx # Payment method management
├── lib/                  # Utilities and helpers
├── supabase/            # Supabase configuration
│   └── functions/       # Edge functions
└── styles/              # Global styles
```

## 🛠️ Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Modern component library
- **Lucide React**: Icon library

### Backend
- **Supabase**: Backend-as-a-Service
- **PostgreSQL**: Database
- **Edge Functions**: Serverless functions
- **Hono**: Lightweight web framework

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **pnpm**: Package manager

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Supabase account

### 1. Clone the Repository
```bash
git clone https://github.com/Paylux/klyra.git
cd klyra
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_SUPABASE_URL=https://your_project_id.supabase.co
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Function Configuration (Optional - for customization)
NEXT_PUBLIC_SUPABASE_FUNCTION_NAME=''
SUPABASE_KV_TABLE_NAME=''
```

### 4. Supabase Setup
1. Create a new Supabase project
2. Get your project credentials from Settings → API
3. Update the environment variables with your credentials
4. Deploy the Edge Functions to your Supabase project

### 5. Database Setup
The required database tables will be created automatically when you first use the application. The main table is:
- `kv_store_ID`: Key-value store for user data

### 6. Run Development Server
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔧 Development

### Available Scripts
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

### Project Structure
- **Components**: Modular React components with TypeScript
- **UI Library**: shadcn/ui components for consistent design
- **State Management**: React hooks for local state
- **API Integration**: Supabase client for backend communication
- **Styling**: Tailwind CSS with custom design system

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting with custom rules
- **Prettier**: Consistent code formatting
- **Component Architecture**: Reusable, modular components

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms
- **Netlify**: Similar to Vercel deployment
- **Railway**: Full-stack deployment platform
- **Self-hosted**: Docker containerization

## 🔒 Security Considerations

### Environment Variables
- Never commit `.env.local` to version control
- Use different credentials for development and production
- Rotate API keys regularly

### Authentication
- JWT tokens with proper expiration
- Secure session management
- KYC verification for compliance

### Data Protection
- Encrypted data transmission (HTTPS)
- Secure database connections
- Input validation and sanitization

## 📱 Features Overview

### Authentication Flow
1. User registration with email/password
2. Email verification (optional)
3. Secure login with session management
4. KYC verification for enhanced features

### Crypto Operations
- **Buy Crypto**: Purchase cryptocurrencies with fiat
- **Sell Crypto**: Convert crypto to fiat
- **Send Crypto**: Transfer to other users
- **Wallet Management**: View balances and transactions

### Payment Methods
- Credit/Debit cards
- Bank transfers
- Mobile money integration
- Secure payment processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Test thoroughly before submitting PRs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation in the `/docs` folder
- Review the Supabase documentation for backend questions

## 🔮 Roadmap

### Planned Features
- [ ] Multi-language support
- [ ] Advanced trading features
- [ ] Mobile app development
- [ ] DeFi integration
- [ ] NFT support
- [ ] Advanced analytics dashboard

### Technical Improvements
- [ ] Performance optimization
- [ ] Enhanced security features
- [ ] Better error handling
- [ ] Comprehensive testing suite
- [ ] CI/CD pipeline
