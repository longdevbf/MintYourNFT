import { NextResponse } from 'next/server';

const JWT = process.env.NEXT_PUBLIC_JWT;
const GATEWAY = process.env.NEXT_PUBLIC_GATEWAY;

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
    
        if (!file) {
            return NextResponse.json({ error: 'File is required' }, { status: 400 });
        }
    
        if (!JWT || !GATEWAY) {
            return NextResponse.json({ error: 'IPFS configuration missing' }, { status: 500 });
        }

        const pinataUrl = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
        
        const pinataFormData = new FormData();
        pinataFormData.append('file', file);

        const response = await fetch(pinataUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${JWT}`,
            },
            body: pinataFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Pinata upload failed:', errorText);
            return NextResponse.json({ error: 'IPFS upload failed' }, { status: 500 });
        }

        const data = await response.json();
        
        // Trả về cả URL gateway và ipfs:// format
        return NextResponse.json({ 
            fileUrl: `https://${GATEWAY}/ipfs/${data.IpfsHash}`,
            ipfsUrl: `ipfs://${data.IpfsHash}`,
            cid: data.IpfsHash
        });
    } catch (error) {
        console.error('Error uploading to IPFS:', error);
        return NextResponse.json({ error: 'Failed to upload file to IPFS' }, { status: 500 });
    }
}